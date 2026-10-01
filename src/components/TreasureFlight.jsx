import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, CylinderGeometry, Object3D, Points, PointsMaterial } from 'three'
import { CHEST, CHEST_SCALE } from '../data/world.js'
import { subscribeChestClaim } from '../systems/chest.js'
import { goldGlowTexture } from '../utils/textures.js'

const ITEMS = 96 // flying coins (a few overlapping claims)
const PER_CLAIM = 34
const TRAIL = 420 // additive sparkle pool: trails and arrival pops
const LAUNCH_G = 15
const COLORS = [[1, 1, 0.85], [1, 0.82, 0.25], [1, 0.62, 0.12], [1, 0.95, 0.55]]
const ORIGIN_Y = 0.85 * CHEST_SCALE // top of the chest body, world metres

// The prize leaving the chest: every claim (the opener's and each redeemer's) sends a stream of
// gold coins out of the open chest that arcs up and homes in on the claiming player, trailing
// bright sparkles and popping on arrival. Claims arrive from the server for everyone, so every
// player sees the treasure fly to whoever took it. World space, so it lives outside the chest group.
export default function TreasureFlight() {
  const mesh = useRef()
  const dummy = useMemo(() => new Object3D(), [])
  const items = useMemo(
    () => Array.from({ length: ITEMS }, () => ({ on: false, wait: 0, fly: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, rx: 0, target: null })),
    [],
  )
  const trail = useMemo(() => {
    const pos = new Float32Array(TRAIL * 3)
    const col = new Float32Array(TRAIL * 3)
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(pos, 3))
    geo.setAttribute('color', new BufferAttribute(col, 3))
    const mat = new PointsMaterial({ map: goldGlowTexture(), vertexColors: true, size: 0.5, blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, fog: false })
    const parts = Array.from({ length: TRAIL }, () => ({ life: 0, max: 1, c: COLORS[0], x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }))
    return { points: new Points(geo, mat), pos, col, geo, parts, next: 0 }
  }, [])
  const coinGeo = useMemo(() => new CylinderGeometry(0.16, 0.16, 0.05, 14), [])
  const nextItem = useRef(0)

  const spark = (x, y, z, speed, life) => {
    const q = trail.parts[trail.next]
    trail.next = (trail.next + 1) % TRAIL
    q.x = x
    q.y = y
    q.z = z
    q.vx = (Math.random() - 0.5) * speed
    q.vy = (Math.random() - 0.5) * speed
    q.vz = (Math.random() - 0.5) * speed
    q.max = q.life = life * (0.7 + Math.random() * 0.6)
    q.c = COLORS[(Math.random() * COLORS.length) | 0]
  }

  useEffect(
    () =>
      subscribeChestClaim((getPos, delay) => {
        for (let n = 0; n < PER_CLAIM; n++) {
          const it = items[nextItem.current]
          nextItem.current = (nextItem.current + 1) % ITEMS
          it.on = true
          it.target = getPos
          it.wait = delay + n * 0.035 + Math.random() * 0.25
          it.fly = 0
          it.x = CHEST.x + (Math.random() - 0.5) * 1.8
          it.y = ORIGIN_Y + 0.2
          it.z = CHEST.z + (Math.random() - 0.5) * 1.2
          const a = Math.random() * 6.28
          const h = 0.8 + Math.random() * 2.2
          it.vx = Math.cos(a) * h
          it.vz = Math.sin(a) * h
          it.vy = 6 + Math.random() * 4
          it.spin = (Math.random() - 0.5) * 22
          it.rx = Math.random() * 6
        }
      }),
    [items],
  )

  useFrame((_s, delta) => {
    const dt = Math.min(delta, 0.1)
    for (let i = 0; i < ITEMS; i++) {
      const it = items[i]
      let scale = 0.0001
      if (it.on) {
        if (it.wait > 0) {
          it.wait -= dt
          // Waiting inside the chest: hidden.
        } else {
          it.fly += dt
          const tp = it.target ? it.target() : null
          if (it.fly < 0.4 || !tp) {
            // Pop out of the chest on a ballistic arc (or, if the claimant is gone, fall and fade).
            it.vy -= LAUNCH_G * dt
            if (!tp && it.fly > 1.2) it.on = false
          } else {
            // Home in on the claimant's chest height, speeding up as it goes.
            const dx = tp.x - it.x
            const dy = tp.y + 1.0 - it.y
            const dz = tp.z - it.z
            const d = Math.hypot(dx, dy, dz)
            if (d < 0.7) {
              for (let k = 0; k < 7; k++) spark(it.x, it.y, it.z, 5, 0.5)
              it.on = false
            } else {
              const speed = 7 + (it.fly - 0.4) * 26
              const k = Math.min(1, dt * 7)
              it.vx += ((dx / d) * speed - it.vx) * k
              it.vy += ((dy / d) * speed - it.vy) * k
              it.vz += ((dz / d) * speed - it.vz) * k
            }
          }
          it.x += it.vx * dt
          it.y += it.vy * dt
          it.z += it.vz * dt
          it.rx += it.spin * dt
          if (it.on) {
            spark(it.x, it.y, it.z, 0.6, 0.45)
            scale = 1.5
          }
        }
      }
      dummy.position.set(it.x, it.y, it.z)
      dummy.rotation.set(it.rx, it.rx * 0.6, 0)
      dummy.scale.setScalar(it.on && it.wait <= 0 ? scale : 0.0001)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true

    for (let i = 0; i < TRAIL; i++) {
      const q = trail.parts[i]
      if (q.life > 0) {
        q.life -= dt
        q.x += q.vx * dt
        q.y += q.vy * dt
        q.z += q.vz * dt
      }
      const k = q.life > 0 ? Math.min(1, (q.life / q.max) * 1.6) : 0
      trail.pos[i * 3] = q.x
      trail.pos[i * 3 + 1] = q.y
      trail.pos[i * 3 + 2] = q.z
      trail.col[i * 3] = q.c[0] * k
      trail.col[i * 3 + 1] = q.c[1] * k
      trail.col[i * 3 + 2] = q.c[2] * k
    }
    trail.geo.attributes.position.needsUpdate = true
    trail.geo.attributes.color.needsUpdate = true
  })

  return (
    <>
      <instancedMesh ref={mesh} args={[coinGeo, undefined, ITEMS]} frustumCulled={false}>
        <meshBasicMaterial color="#ffe066" toneMapped={false} />
      </instancedMesh>
      <primitive object={trail.points} frustumCulled={false} />
    </>
  )
}
