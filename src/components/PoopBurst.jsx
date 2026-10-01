import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Object3D } from 'three'
import { player } from '../systems/playerState.js'
import { subscribePoopDrop } from '../systems/poop.js'
import { emitPoopBurst, subscribePoopBurst } from '../systems/poopFx.js'
import { FOODS } from '../systems/shop.js'
import { PALETTE } from '../materials/tile.js'

const MAX = 132 // particle pool (a few overlapping drops, local + remote)
const PER_DROP = 22
const LIFE = 0.9 // s
const GRAVITY = 9
const HIP_Y = 0.5 // fraction of player height the poop leaves from

// Chunks of poop spat out behind the player (world space) each time a poop drops,
// tinted like the poop (food colour, else plain brown).
export default function PoopBurst() {
  const mesh = useRef()
  const dummy = useMemo(() => new Object3D(), [])
  const parts = useMemo(() => Array.from({ length: MAX }, () => ({ life: 0, floor: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 1 })), [])
  const next = useRef(0)

  // Allocate the per-instance colour buffer up front so the material compiles with instance colours.
  useEffect(() => {
    const m = mesh.current
    if (!m) return
    const c = new Color(PALETTE.poop)
    for (let i = 0; i < MAX; i++) m.setColorAt(i, c)
    m.instanceColor.needsUpdate = true
  }, [])

  // The local drop becomes a burst at the local player; remote drops arrive via net.js.
  useEffect(
    () =>
      subscribePoopDrop((type) =>
        emitPoopBurst({
          x: player.position.x,
          y: player.position.y,
          z: player.position.z,
          facing: player.facing,
          height: player.dims.height,
          color: FOODS.find((f) => f.id === type)?.color ?? PALETTE.poop,
        }),
      ),
    [],
  )

  useEffect(
    () =>
      subscribePoopBurst((b) => {
        const m = mesh.current
        if (!m) return
        const color = new Color(b.color)
        // Character forward is (sin, cos) of facing; the burst goes the other way.
        const fx = Math.sin(b.facing)
        const fz = Math.cos(b.facing)
        for (let i = 0; i < PER_DROP; i++) {
          const p = parts[next.current]
          const idx = next.current
          next.current = (next.current + 1) % MAX
          const spread = (Math.random() - 0.5) * 1.6
          const speed = 1.5 + Math.random() * 2.5
          p.x = b.x - fx * 0.35
          p.y = b.y + b.height * HIP_Y
          p.z = b.z - fz * 0.35
          p.floor = b.y + 0.03
          // back direction rotated sideways by `spread`
          const c = Math.cos(spread)
          const s = Math.sin(spread)
          p.vx = -(fx * c - fz * s) * speed
          p.vz = -(fx * s + fz * c) * speed
          p.vy = 0.5 + Math.random() * 1.5
          p.s = 0.28 + Math.random() * 0.32
          p.life = LIFE * (0.7 + Math.random() * 0.3)
          m.setColorAt(idx, color)
        }
        if (m.instanceColor) m.instanceColor.needsUpdate = true
      }),
    [parts],
  )

  useFrame((_s, delta) => {
    const m = mesh.current
    if (!m) return
    const dt = Math.min(delta, 0.1)
    for (let i = 0; i < MAX; i++) {
      const p = parts[i]
      if (p.life > 0) {
        p.life -= dt
        p.vy -= GRAVITY * dt
        p.x += p.vx * dt
        p.y = Math.max(p.floor, p.y + p.vy * dt)
        p.z += p.vz * dt
      }
      const k = p.life > 0 ? Math.min(1, p.life / 0.25) : 0
      dummy.position.set(p.x, p.y, p.z)
      dummy.scale.setScalar(p.s * k + 0.0001)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[null, null, MAX]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial roughness={0.6} />
    </instancedMesh>
  )
}
