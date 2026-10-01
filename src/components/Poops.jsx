import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Object3D } from 'three'
import { POOP_LIFE, poops } from '../systems/poop.js'
import { poopGeometry } from '../utils/poopGeometry.js'

const CAPACITY = 48
const POP = 0.28 // s pop-in
const SHRINK = 0.6 // s shrink-out at end of life
const dummy = new Object3D()
const tint = new Color()

// easeOutBack: overshoots a little so each drop "plops".
function plop(t) {
  const c = 1.9
  const u = t - 1
  return 1 + (c + 1) * u * u * u + c * u * u
}

// Draws the live poops from systems/poop.js as one instanced mesh.
export default function Poops() {
  const mesh = useRef()
  useFrame(() => {
    const m = mesh.current
    if (!m) return
    poops.forEach((p, i) => {
      let s = p.age < POP ? plop(p.age / POP) : 1
      const left = POOP_LIFE - p.age
      if (left < SHRINK) s *= Math.max(left / SHRINK, 0)
      dummy.position.set(p.x, p.y, p.z)
      dummy.rotation.set(0, p.yaw, 0)
      dummy.scale.set(p.size * s, p.size * s * (p.age < POP ? 2 - s : 1), p.size * s)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      m.setColorAt(i, tint.set(p.color))
    })
    m.count = poops.length
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  return (
    <instancedMesh ref={mesh} args={[poopGeometry(), undefined, CAPACITY]} count={0} frustumCulled={false} castShadow>
      <meshStandardMaterial color="#ffffff" roughness={0.5} />
    </instancedMesh>
  )
}
