import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ExtrudeGeometry, Object3D, Shape } from 'three'
import { player } from '../systems/playerState.js'
import { terrainHeightAt } from '../systems/terrainHeight.js'
import { getTutorial } from '../systems/tutorial.js'

const SPACING = 0.95 // m between arrows
const SPEED = 1.6 // m/s the trail crawls toward the target
const MAX_ARROWS = 60
const HIDE_WITHIN = 2.5 // m from the target where the trail disappears

// The tutorial trail: a line of red 3D arrowheads on the ground from the player to the
// current step's target (data/tutorial.js `target`), crawling toward it, plus one big
// arrow bobbing over the target itself. Ported from Fart-to-break-doors.
export default function GuideArrows() {
  const trail = useRef()
  const beacon = useRef()
  const dummy = useMemo(() => new Object3D(), [])

  const geometry = useMemo(() => {
    const s = new Shape()
    s.moveTo(0, 0.42)
    s.lineTo(0.34, -0.2)
    s.lineTo(0, -0.05)
    s.lineTo(-0.34, -0.2)
    s.closePath()
    const g = new ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 })
    g.center()
    return g
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(({ clock }) => {
    const mesh = trail.current
    const top = beacon.current
    if (!mesh || !top) return
    const t = getTutorial()
    const target = t.visible ? t.step?.target ?? null : null
    if (!target) {
      mesh.count = 0
      top.visible = false
      return
    }
    const dx = target.x - player.position.x
    const dz = target.z - player.position.z
    const dist = Math.hypot(dx, dz)
    const ux = dx / (dist || 1)
    const uz = dz / (dist || 1)
    const heading = Math.atan2(ux, uz)
    const phase = (clock.elapsedTime * SPEED) % SPACING

    let n = 0
    if (dist > HIDE_WITHIN) {
      for (let d = 1.2 + phase; d < dist - 0.6 && n < MAX_ARROWS; d += SPACING) {
        const x = player.position.x + ux * d
        const z = player.position.z + uz * d
        dummy.position.set(x, terrainHeightAt(x, z) + 0.22, z)
        // Lay the arrowhead down, tip toward the target, slightly tilted up.
        dummy.rotation.set(Math.PI / 2 - 0.35, heading, 0, 'YXZ')
        dummy.updateMatrix()
        mesh.setMatrixAt(n++, dummy.matrix)
      }
    }
    mesh.count = n
    mesh.instanceMatrix.needsUpdate = true

    // Beacon: upright arrow pointing down at the target, bobbing.
    top.visible = true
    top.position.set(target.x, target.y + 0.4 * Math.sin(clock.elapsedTime * 3), target.z)
    top.rotation.set(Math.PI, 0, 0)
  })

  return (
    <>
      <instancedMesh ref={trail} args={[geometry, undefined, MAX_ARROWS]} frustumCulled={false}>
        <meshStandardMaterial color="#ff2a2a" emissive="#ff1010" emissiveIntensity={0.6} roughness={0.5} />
      </instancedMesh>
      <mesh ref={beacon} geometry={geometry} scale={3.2} visible={false} frustumCulled={false}>
        <meshStandardMaterial color="#ff2a2a" emissive="#ff1010" emissiveIntensity={0.8} roughness={0.5} />
      </mesh>
    </>
  )
}
