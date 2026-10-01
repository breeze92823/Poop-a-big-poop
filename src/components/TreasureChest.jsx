import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, CylinderGeometry, DoubleSide, Object3D, PlaneGeometry, Points, PointsMaterial, RingGeometry, TorusGeometry, Vector3 } from 'three'
import { CHEST, CHEST_SCALE, facePad } from '../data/world.js'
import { PALETTE } from '../materials/tile.js'
import { goldGlowTexture, chestLabelTexture, plankTexture, rayTexture } from '../utils/textures.js'
import { seededRandom } from '../utils/random.js'
import { chestBadge, getChestState, subscribeChestClaim, subscribeChestOpen } from '../systems/chest.js'

// Chest body (1x units; the whole thing is scaled by CHEST_SCALE).
const W = 1.6
const D = 1.1
const H = 0.85
const R = D / 2 // lid radius: a half cylinder spanning the depth
const TRIM = 0.1
const GOLD = '#f5c518'
const CHAIN_X = 0.3 // chain runs over the lid right of centre, as in the reference
const LINK_SPACING = 0.15
const HANG_MAX = 8
const LOCK_TOP = new Vector3(CHAIN_X, H - 0.1, D / 2 + 0.1)

// Lid angles (radians, positive = open): resting ajar so the coins peek out,
// and the most the chain lets it lift.
const REST = 0.06
const MAX = 0.34
const CYCLE = 5 // s per open attempt

const SPARK_COUNT = 36
const OPEN = 1.25 // lid angle when the chest is properly opened (E)
const OPEN_TIME = 4.4 // s the whole opening sequence lasts
const BURST_PARTS = 260 // bright particle pool
const BURST_COINS = 30 // flying coins
const GRAV = 6 // local units / s^2
const BURST_COLORS = [[1, 1, 0.85], [1, 0.82, 0.25], [1, 0.62, 0.12], [1, 0.95, 0.55]]
const RAY_COUNT = 7

// The loop: sit still, rattle, heave the lid up against the chain, slam shut
// and bounce. Returns the lid angle and how hard the body shakes.
function chestPose(t) {
  const p = t % CYCLE
  if (p < 1.8) return { lid: REST + 0.008 * Math.sin(t * 2), shake: 0, squash: 0 }
  if (p < 2.8) {
    const k = (p - 1.8) / 1
    return { lid: REST + 0.07 * Math.abs(Math.sin(k * 26)) * Math.sin(k * Math.PI), shake: 0.6, squash: 0 }
  }
  if (p < 3.5) {
    const k = (p - 2.8) / 0.7
    const ease = 1 - (1 - k) ** 3
    return { lid: REST + (MAX - REST) * ease + 0.025 * Math.sin(t * 70) * k, shake: 1, squash: 0 }
  }
  if (p < 3.68) {
    const k = (p - 3.5) / 0.18
    return { lid: MAX * (1 - k * k), shake: 0, squash: 0 }
  }
  if (p < 4.3) {
    const k = (p - 3.68) / 0.62
    return { lid: REST * k + 0.08 * Math.abs(Math.sin(k * Math.PI * 2)) * (1 - k), shake: 0, squash: (1 - k) ** 2 }
  }
  return { lid: REST, shake: 0, squash: 0 }
}

// Opening sequence at p seconds in: the lid bursts up with an overshoot and settles wide open.
// The chest then stays open for everyone (the steady pose in useFrame).
function openPose(p) {
  if (p < 0.3) {
    const k = p / 0.3 - 1
    const e = 1 + 2.70158 * k ** 3 + 1.70158 * k ** 2
    return { lid: REST + (OPEN - REST) * e, shake: 1, squash: 0 }
  }
  return { lid: OPEN + 0.04 * Math.sin(p * 7) * Math.max(0, 1 - (p - 0.3) / 1.5), shake: 0, squash: 0 }
}

// The 12 edge bars of a w x h x d box centred on the origin: [position, size].
function edgeBars(w, h, d, t) {
  const out = []
  for (const a of [-1, 1]) {
    for (const b of [-1, 1]) {
      out.push([[0, (a * h) / 2, (b * d) / 2], [w + t, t, t]])
      out.push([[(a * w) / 2, 0, (b * d) / 2], [t, h + t, t]])
      out.push([[(a * w) / 2, (b * h) / 2, 0], [t, t, d + t]])
    }
  }
  return out
}

// Chain over the lid in lid space (origin at the hinge): from the back edge,
// over the dome, to the front lip.
function lidChainMatrices() {
  const r = R + 0.04
  const path = (u) => {
    const a = Math.PI * (1 - u)
    return new Vector3(CHAIN_X, Math.sin(a) * r, R + Math.cos(a) * r)
  }
  const dummy = new Object3D()
  const out = []
  const steps = Math.round((Math.PI * r) / LINK_SPACING)
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    dummy.position.copy(path(u))
    dummy.lookAt(path(u + 0.01))
    if (i % 2) dummy.rotateZ(Math.PI / 2)
    dummy.updateMatrix()
    out.push(dummy.matrix.clone())
  }
  return out
}

function makeLinkGeometry() {
  // Squarish link, long axis along +Z so lookAt lines it up with the chain.
  const g = new TorusGeometry(0.06, 0.02, 6, 4)
  g.rotateZ(Math.PI / 4)
  g.rotateY(Math.PI / 2)
  g.scale(1, 1, 1.5)
  return g
}

function coinMatrices() {
  const rand = seededRandom(9)
  const dummy = new Object3D()
  const out = []
  for (let i = 0; i < 46; i++) {
    dummy.position.set((rand() - 0.5) * (W - 0.24), H - 0.01 + rand() * 0.06, (rand() - 0.5) * (D - 0.24))
    dummy.rotation.set((rand() - 0.5) * 0.9, rand() * 6.28, (rand() - 0.5) * 0.9)
    dummy.updateMatrix()
    out.push(dummy.matrix.clone())
  }
  return out
}

// Gold sparkles drifting up around the chest.
function useSparkles() {
  return useMemo(() => {
    const pos = new Float32Array(SPARK_COUNT * 3)
    const seed = Array.from({ length: SPARK_COUNT }, () => ({ a: Math.random() * 6.28, y: Math.random() * 2.4, v: 0.25 + Math.random() * 0.5, r: 0.9 + Math.random() * 0.5 }))
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(pos, 3))
    const mat = new PointsMaterial({ color: '#ffe27a', map: goldGlowTexture(), size: 0.16, blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false })
    return { points: new Points(geo, mat), pos, seed, geo }
  }, [])
}

// Bright additive particle pool for the opening burst (positions in chest-local units).
function useBurst() {
  return useMemo(() => {
    const pos = new Float32Array(BURST_PARTS * 3)
    const col = new Float32Array(BURST_PARTS * 3)
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(pos, 3))
    geo.setAttribute('color', new BufferAttribute(col, 3))
    const mat = new PointsMaterial({ map: goldGlowTexture(), vertexColors: true, size: 0.6, blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, fog: false })
    const parts = Array.from({ length: BURST_PARTS }, () => ({ life: 0, max: 1, c: BURST_COLORS[0], x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }))
    const coins = Array.from({ length: BURST_COINS }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, rx: 0, rz: 0 }))
    return { points: new Points(geo, mat), pos, col, geo, parts, coins, next: 0 }
  }, [])
}

const lidGeo = new CylinderGeometry(R, R, W, 28, 1, false, 0, Math.PI)
lidGeo.rotateZ(Math.PI / 2)
lidGeo.translate(0, 0, R)
const rayGeo = new PlaneGeometry(1, 1)
rayGeo.translate(0, 0.5, 0)

const ringGeo = new RingGeometry(0.82, 1, 56)
ringGeo.rotateX(-Math.PI / 2)

const _a = new Vector3()
const _b = new Vector3()
const _dir = new Vector3()
const _dummy = new Object3D()

// Treasure chest that keeps trying to burst open: wooden planks in gold trim,
// a heap of coins, a chain over the lid down to a gold padlock. Every few
// seconds it rattles, heaves the lid up against the chain (gold light and god
// rays spill out of the gap) and slams shut. When any player opens it (systems/chest.js,
// broadcast by the server) the chain snaps, the lid is thrown wide and it erupts in bright gold
// particles, flying coins, a flash and a shockwave ring on every client, then stays open.
export default function TreasureChest() {
  const body = useRef()
  const lid = useRef()
  const hang = useRef()
  const lidLinks = useRef()
  const coins = useRef()
  const lock = useRef()
  const inner = useRef()
  const front = useRef()
  const halo = useRef()
  const rays = useRef()
  const label = useRef()
  const coinMat = useRef()
  const shock = useRef()
  const flyCoins = useRef()
  const openAt = useRef(-1) // clock time the E-opening started
  const openReq = useRef(false)
  const puffReq = useRef(false)
  const puffAt = useRef(-9)
  const streamAcc = useRef(0)
  const burstFired = useRef(false)
  const shockT0 = useRef(0)

  const wood = useMemo(() => plankTexture(), [])
  const lidWood = useMemo(() => {
    const t = wood.clone()
    t.center.set(0.5, 0.5)
    t.rotation = Math.PI / 2
    t.needsUpdate = true
    return t
  }, [wood])
  const glowMap = useMemo(() => goldGlowTexture(), [])
  const rayMap = useMemo(() => rayTexture(), [])
  const linkGeo = useMemo(() => makeLinkGeometry(), [])
  const coinGeo = useMemo(() => new CylinderGeometry(0.085, 0.085, 0.025, 14), [])
  const lidMatrices = useMemo(() => lidChainMatrices(), [])
  const coinMats = useMemo(() => coinMatrices(), [])
  const bodyBars = useMemo(() => edgeBars(W, H, D, TRIM), [])
  const sparks = useSparkles()
  const burst = useBurst()
  const flyDummy = useMemo(() => new Object3D(), [])

  useEffect(() => subscribeChestOpen(() => { openReq.current = true }), [])
  // Each redeem puffs gold out of the already-open chest as the treasure flies off.
  useEffect(() => subscribeChestClaim(() => { puffReq.current = true }), [])

  useLayoutEffect(() => {
    lidMatrices.forEach((m, i) => lidLinks.current.setMatrixAt(i, m))
    lidLinks.current.instanceMatrix.needsUpdate = true
    lidLinks.current.computeBoundingSphere()
    coinMats.forEach((m, i) => coins.current.setMatrixAt(i, m))
    coins.current.instanceMatrix.needsUpdate = true
    coins.current.computeBoundingSphere()
  }, [lidMatrices, coinMats])

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    if (openReq.current) {
      openReq.current = false
      openAt.current = t
      burstFired.current = false
      streamAcc.current = 0
    }
    let p = openAt.current >= 0 ? t - openAt.current : -1
    if (p > OPEN_TIME) { openAt.current = -1; p = -1 }
    const opening = p >= 0
    // Once anyone has opened it the chest stays open for everyone, so a player who joins
    // later sees it already open (no animation).
    const steady = !opening && getChestState().open
    const { lid: angle, shake, squash } = opening ? openPose(p) : steady ? { lid: OPEN, shake: 0, squash: 0 } : chestPose(t)
    const open = steady ? 0.5 + 0.1 * Math.sin(t * 3) : Math.min(1, Math.max(0, (angle - REST) / (MAX - REST)))

    // Emit one bright particle out of the open lid.
    const spawn = (speed, up) => {
      const q = burst.parts[burst.next]
      burst.next = (burst.next + 1) % BURST_PARTS
      q.x = (Math.random() - 0.5) * W * 0.7
      q.y = H + 0.15
      q.z = (Math.random() - 0.5) * D * 0.5
      const a = Math.random() * 6.28
      const h = Math.random() * speed * 0.55
      q.vx = Math.cos(a) * h
      q.vz = Math.sin(a) * h * 0.8
      q.vy = up * (0.55 + Math.random() * 0.6)
      q.max = q.life = 0.9 + Math.random() * 1.3
      q.c = BURST_COLORS[(Math.random() * BURST_COLORS.length) | 0]
    }
    if (puffReq.current) {
      puffReq.current = false
      if (!opening) {
        puffAt.current = t
        for (let i = 0; i < 70; i++) spawn(4, 6.5)
      }
    }
    if (opening) {
      if (!burstFired.current && p >= 0.1) {
        burstFired.current = true
        for (let i = 0; i < 170; i++) spawn(6, 8.5)
        for (let i = 0; i < BURST_COINS; i++) {
          const c = burst.coins[i]
          c.life = 2.2 + Math.random() * 0.8
          c.x = (Math.random() - 0.5) * W * 0.6
          c.y = H + 0.1
          c.z = (Math.random() - 0.5) * D * 0.4
          const a = Math.random() * 6.28
          const h = 0.8 + Math.random() * 2.2
          c.vx = Math.cos(a) * h
          c.vz = Math.sin(a) * h
          c.vy = 4.5 + Math.random() * 4
          c.spin = (Math.random() - 0.5) * 20
          c.rx = Math.random() * 6
          c.rz = Math.random() * 6
        }
        shockT0.current = p
      }
      if (p > 0.3 && p < 3.2) {
        streamAcc.current += dt * 55
        while (streamAcc.current >= 1) { streamAcc.current -= 1; spawn(3, 5) }
      }
    } else if (steady) {
      // A gentle trickle of gold keeps pouring out of the open chest.
      streamAcc.current += dt * 10
      while (streamAcc.current >= 1) { streamAcc.current -= 1; spawn(2, 3.5) }
    }

    lid.current.rotation.x = -angle
    body.current.position.x = Math.sin(t * 55) * 0.022 * shake
    body.current.rotation.z = Math.sin(t * 47) * 0.035 * shake
    body.current.scale.set(1 + squash * 0.06, 1 - squash * 0.08, 1 + squash * 0.06)

    // Opening snaps the chain: the padlock drops and lies on the ground beside the open chest.
    const broken = opening || steady
    const bp = opening ? p : 9
    hang.current.visible = !broken
    if (broken) {
      const fall = Math.min(bp, 0.9)
      lock.current.position.set(LOCK_TOP.x + fall * 0.6, Math.max(0.12, LOCK_TOP.y - 4.5 * bp * bp), LOCK_TOP.z + fall * 0.8)
      lock.current.rotation.set(Math.min(bp, 0.6) * 4, 0, Math.min(bp, 0.6) * 3)
    } else {
      lock.current.position.copy(LOCK_TOP)
    }

    // Hanging chain: from the lid's front lip down to the padlock.
    const ca = Math.cos(angle)
    const sa = Math.sin(angle)
    const lz = D + 0.04
    _a.set(CHAIN_X, H + lz * sa, -D / 2 + lz * ca)
    _dir.subVectors(LOCK_TOP, _a)
    const len = _dir.length()
    const n = Math.min(HANG_MAX, Math.max(1, Math.round(len / LINK_SPACING)))
    for (let i = 0; i < n; i++) {
      _dummy.position.copy(_a).addScaledVector(_dir, (i + 0.5) / n)
      _dummy.rotation.set(0, 0, 0)
      _dummy.lookAt(_b.copy(_dummy.position).add(_dir))
      if (i % 2) _dummy.rotateZ(Math.PI / 2)
      _dummy.updateMatrix()
      hang.current.setMatrixAt(i, _dummy.matrix)
    }
    hang.current.count = n
    hang.current.instanceMatrix.needsUpdate = true

    // Padlock swings on the chain while the chest struggles.
    if (!broken) {
      lock.current.rotation.z = Math.sin(t * 9) * 0.25 * Math.max(shake, open)
      lock.current.rotation.x = -open * 0.3
    }

    // Light: steady pulse, flaring when the lid gap opens.
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2)
    const puff = 28 * Math.exp(-Math.max(0, t - puffAt.current) * 4)
    const flash = puff + (opening ? 70 * Math.exp(-Math.max(0, p - 0.1) * 2.2) * Math.min(1, p / 0.1) : 0)
    inner.current.intensity = 1.5 + open * 14 + Math.random() * open * 3 + flash
    front.current.intensity = 3 + pulse * 1.5 + open * 4 + flash * 0.3
    const badge = chestBadge()
    const labelMap = chestLabelTexture(badge.text, badge.tone)
    if (label.current.material.map !== labelMap) {
      label.current.material.map = labelMap
      label.current.material.needsUpdate = true
    }
    label.current.position.y = 2.6 + Math.sin(t * 1.6) * 0.06
    label.current.scale.set(3.4, 1.06, 1).multiplyScalar(1 + 0.04 * Math.sin(t * 4))
    halo.current.material.opacity = Math.min(1, 0.55 + 0.25 * pulse + 0.2 * open + flash * 0.01)
    halo.current.scale.setScalar(1 + 0.06 * pulse + 0.15 * open + flash * 0.008)
    coinMat.current.emissiveIntensity = 0.35 + open * 1.4 + flash * 0.03
    rays.current.children.forEach((ray, i) => {
      ray.material.opacity = open * (0.55 + 0.25 * Math.sin(t * 9 + i * 1.7))
      ray.scale.y = 0.4 + open * (1.4 + 0.3 * Math.sin(t * 5 + i)) * (opening ? 2.2 : 1)
    })

    sparks.seed.forEach((s, i) => {
      s.y += s.v * dt * (1 + open * 3)
      if (s.y > 2.6) { s.y = 0.05; s.a = Math.random() * 6.28 }
      const a = s.a + t * 0.6
      sparks.pos[i * 3] = Math.cos(a) * s.r
      sparks.pos[i * 3 + 1] = s.y
      sparks.pos[i * 3 + 2] = Math.sin(a) * s.r * 0.8
    })
    sparks.geo.attributes.position.needsUpdate = true

    // Burst particles fade to black (additive), so dying ones vanish.
    const d = Math.min(dt, 0.1)
    for (let i = 0; i < BURST_PARTS; i++) {
      const q = burst.parts[i]
      if (q.life > 0) {
        q.life -= d
        q.vy -= GRAV * d * 0.45
        q.x += q.vx * d
        q.y = Math.max(0.04, q.y + q.vy * d)
        q.z += q.vz * d
      }
      const k = q.life > 0 ? Math.min(1, (q.life / q.max) * 1.8) : 0
      burst.pos[i * 3] = q.x
      burst.pos[i * 3 + 1] = q.y
      burst.pos[i * 3 + 2] = q.z
      burst.col[i * 3] = q.c[0] * k
      burst.col[i * 3 + 1] = q.c[1] * k
      burst.col[i * 3 + 2] = q.c[2] * k
    }
    burst.geo.attributes.position.needsUpdate = true
    burst.geo.attributes.color.needsUpdate = true

    // Flying coins arc out, bounce on the ground and shrink away.
    for (let i = 0; i < BURST_COINS; i++) {
      const c = burst.coins[i]
      if (c.life > 0) {
        c.life -= d
        c.vy -= GRAV * 1.6 * d
        c.x += c.vx * d
        c.y += c.vy * d
        c.z += c.vz * d
        if (c.y < 0.06) { c.y = 0.06; c.vy = Math.abs(c.vy) * 0.45; c.vx *= 0.8; c.vz *= 0.8 }
        c.rx += c.spin * d
      }
      flyDummy.position.set(c.x, c.y, c.z)
      flyDummy.rotation.set(c.rx, c.rx * 0.5, c.rz)
      flyDummy.scale.setScalar(c.life > 0 ? Math.min(1, c.life / 0.4) * 1.6 : 0.0001)
      flyDummy.updateMatrix()
      flyCoins.current.setMatrixAt(i, flyDummy.matrix)
    }
    flyCoins.current.instanceMatrix.needsUpdate = true

    // Shockwave ring on the ground.
    const sp = opening && burstFired.current ? p - shockT0.current : 9
    shock.current.visible = sp < 1
    if (sp < 1) {
      shock.current.scale.setScalar(0.4 + sp * 5)
      shock.current.material.opacity = (1 - sp) ** 1.5
    }
  })

  const gold = <meshStandardMaterial color={GOLD} emissive="#6b4a00" emissiveIntensity={0.5} roughness={0.32} metalness={0.45} />

  return (
    <group position={[CHEST.x, 0, CHEST.z]} rotation-y={facePad(CHEST.x, CHEST.z)} scale={CHEST_SCALE}>
      {/* Ground halo, sparkles and lights stay put while the chest shakes. */}
      <mesh ref={halo} position-y={0.03} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[3.6, 3.6]} />
        <meshBasicMaterial map={glowMap} transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <primitive object={sparks.points} frustumCulled={false} />
      <primitive object={burst.points} frustumCulled={false} />
      <mesh ref={shock} geometry={ringGeo} position-y={0.05} visible={false}>
        <meshBasicMaterial color="#ffe27a" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} side={DoubleSide} />
      </mesh>
      <instancedMesh ref={flyCoins} args={[coinGeo, undefined, BURST_COINS]} frustumCulled={false}>
        <meshBasicMaterial color="#ffe066" toneMapped={false} />
      </instancedMesh>
      <pointLight ref={inner} position={[0, H + 0.25, 0.2]} color="#ffc23a" intensity={2} distance={14} decay={1.5} />
      <pointLight ref={front} position={[0, 1, 1.7]} color="#ffd36a" intensity={3} distance={10} decay={1.5} />

      <sprite ref={label} position={[0, 2.6, 0]} scale={[3.4, 1.06, 1]} renderOrder={10}>
        <spriteMaterial map={chestLabelTexture('FREE! 5 LEFT')} depthWrite={false} toneMapped={false} fog={false} />
      </sprite>

      <group ref={body}>
        <mesh position-y={H / 2} castShadow receiveShadow>
          <boxGeometry args={[W, H, D]} />
          <meshStandardMaterial map={wood} roughness={0.8} />
        </mesh>
        {bodyBars.map(([p, s], i) => (
          <mesh key={i} position={[p[0], p[1] + H / 2, p[2]]} castShadow>
            <boxGeometry args={s} />
            {gold}
          </mesh>
        ))}
        <instancedMesh ref={coins} args={[coinGeo, undefined, coinMats.length]}>
          <meshStandardMaterial ref={coinMat} color="#ffd21f" emissive="#ffae00" emissiveIntensity={0.35} roughness={0.3} metalness={0.4} />
        </instancedMesh>

        {/* God rays fanning up out of the lid gap. */}
        <group ref={rays} position={[0, H + 0.05, D / 2 - 0.05]} rotation-x={0.45}>
          {Array.from({ length: RAY_COUNT }, (_, i) => {
            const k = i / (RAY_COUNT - 1) - 0.5
            return (
              <mesh key={i} geometry={rayGeo} position-x={k * W * 0.8} rotation-z={-k * 1.1} scale={[0.32, 1, 1]}>
                <meshBasicMaterial map={rayMap} color="#ffd860" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} toneMapped={false} />
              </mesh>
            )
          })}
        </group>

        {/* Lid, hinged on the back top edge. */}
        <group ref={lid} position={[0, H, -D / 2]}>
          <mesh geometry={lidGeo} castShadow>
            <meshStandardMaterial map={lidWood} roughness={0.8} side={DoubleSide} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[(s * W) / 2, 0, R]} rotation-y={Math.PI / 2} castShadow>
              <torusGeometry args={[R, TRIM / 2, 6, 24, Math.PI]} />
              {gold}
            </mesh>
          ))}
          {[0, D].map((z) => (
            <mesh key={z} position={[0, 0.05, z]} castShadow>
              <boxGeometry args={[W + TRIM, TRIM, TRIM]} />
              {gold}
            </mesh>
          ))}
          <instancedMesh ref={lidLinks} args={[linkGeo, undefined, lidMatrices.length]} castShadow>
            <meshStandardMaterial color={PALETTE.metal} roughness={0.3} metalness={0.75} />
          </instancedMesh>
        </group>

        <instancedMesh ref={hang} args={[linkGeo, undefined, HANG_MAX]} frustumCulled={false} castShadow>
          <meshStandardMaterial color={PALETTE.metal} roughness={0.3} metalness={0.75} />
        </instancedMesh>

        {/* Gold padlock hanging off the chain, round top over a square base. */}
        <group ref={lock} position={LOCK_TOP.toArray()}>
          <mesh position-y={-0.03}>
            <torusGeometry args={[0.05, 0.016, 6, 12]} />
            <meshStandardMaterial color={PALETTE.metal} roughness={0.3} metalness={0.75} />
          </mesh>
          <mesh position-y={-0.2} rotation-x={Math.PI / 2} castShadow>
            <cylinderGeometry args={[0.13, 0.13, 0.08, 20]} />
            {gold}
          </mesh>
          <mesh position-y={-0.29} castShadow>
            <boxGeometry args={[0.26, 0.18, 0.08]} />
            {gold}
          </mesh>
          <mesh position={[0, -0.2, 0.042]}>
            <circleGeometry args={[0.035, 12]} />
            <meshBasicMaterial color="#3b2314" />
          </mesh>
          <mesh position={[0, -0.25, 0.042]}>
            <planeGeometry args={[0.03, 0.08]} />
            <meshBasicMaterial color="#3b2314" />
          </mesh>
        </group>
      </group>
    </group>
  )
}
