import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, LatheGeometry, Object3D, TorusGeometry, Vector2, Vector3 } from 'three'
import { JAR, facePad } from '../data/world.js'
import { PALETTE } from '../materials/tile.js'
import { glowRingTexture } from '../utils/textures.js'
import { poopGeometry } from '../utils/poopGeometry.js'

const JAR_PROFILE = [
  [0, 0], [0.68, 0], [0.84, 0.18], [0.92, 0.65], [0.88, 1.15], [0.74, 1.42], [0.7, 1.55],
].map(([r, y]) => new Vector2(r, y))

const LINK_SPACING = 0.19 // m between chain-link centres

// Chain paths wrapped around the jar: two crossing helices and a belt.
function chainPaths() {
  const helix = (turns, phase, r) => (t) => {
    const a = phase + t * turns * Math.PI * 2
    return new Vector3(Math.cos(a) * r, 0.12 + t * 1.42, Math.sin(a) * r)
  }
  const belt = (t) => {
    const a = t * Math.PI * 2
    return new Vector3(Math.cos(a) * 1.0, 0.82 + Math.sin(a * 3) * 0.05, Math.sin(a) * 1.0)
  }
  return [helix(1.1, 0, 0.99), helix(-1.1, 1.4, 0.99), belt]
}

function linkMatrices() {
  const dummy = new Object3D()
  const out = []
  for (const path of chainPaths()) {
    // Walk the path at a fixed arc length per link.
    let t = 0
    let i = 0
    let prev = path(0)
    while (t < 1) {
      const p = path(t)
      const ahead = path(Math.min(t + 0.01, 1))
      dummy.position.copy(p)
      dummy.lookAt(ahead.equals(p) ? prev : ahead)
      if (i % 2) dummy.rotateZ(Math.PI / 2)
      dummy.updateMatrix()
      out.push(dummy.matrix.clone())
      // Advance t until we've moved LINK_SPACING along the curve.
      let moved = 0
      let last = p
      while (moved < LINK_SPACING && t < 1) {
        t += 0.002
        const q = path(Math.min(t, 1))
        moved += q.distanceTo(last)
        last = q
      }
      prev = p
      i++
    }
  }
  return out
}

// Locked prize: a glass jar with a big poop inside, wrapped in chains and
// padlocked, standing on a white disc ringed with pulsing blue light.
export default function ChainedJar() {
  const glow = useRef()
  const links = useRef()
  const prize = useRef()
  const glowMap = useMemo(() => glowRingTexture(), [])
  const jarGeo = useMemo(() => new LatheGeometry(JAR_PROFILE, 32), [])
  const linkGeo = useMemo(() => {
    const g = new TorusGeometry(0.075, 0.026, 6, 12)
    g.rotateY(Math.PI / 2)
    g.scale(1, 1, 1.55)
    return g
  }, [])
  const matrices = useMemo(() => linkMatrices(), [])

  useLayoutEffect(() => {
    const mesh = links.current
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [matrices])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (glow.current) glow.current.material.opacity = 0.7 + 0.3 * Math.sin(t * 2.4)
    if (prize.current) prize.current.rotation.y = t * 0.4
  })

  return (
    <group position={[JAR.x, 0, JAR.z]} rotation-y={facePad(JAR.x, JAR.z)}>
      <mesh position-y={0.09} castShadow receiveShadow>
        <cylinderGeometry args={[1.45, 1.55, 0.18, 40]} />
        <meshStandardMaterial color="#dfe8f4" roughness={0.5} />
      </mesh>
      <mesh ref={glow} position-y={0.2} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[4.4, 4.4]} />
        <meshBasicMaterial map={glowMap} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0.6, 0]} color={PALETTE.glow} intensity={6} distance={6} decay={1.5} />

      <group position-y={0.18}>
        <mesh ref={prize} geometry={poopGeometry()} position-y={0.08} scale={1.05} castShadow>
          <meshStandardMaterial color={PALETTE.poop} roughness={0.55} />
        </mesh>
        <mesh geometry={jarGeo} renderOrder={2}>
          <meshStandardMaterial color={PALETTE.glass} transparent opacity={0.32} roughness={0.08} metalness={0.1} side={DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position-y={1.66} castShadow>
          <cylinderGeometry args={[0.8, 0.8, 0.24, 28]} />
          <meshStandardMaterial color="#7a4e2c" roughness={0.75} />
        </mesh>
        <mesh position-y={1.84} castShadow>
          <cylinderGeometry args={[0.5, 0.62, 0.14, 28]} />
          <meshStandardMaterial color="#8d5c35" roughness={0.75} />
        </mesh>
        <instancedMesh ref={links} args={[linkGeo, undefined, matrices.length]} castShadow>
          <meshStandardMaterial color={PALETTE.metal} roughness={0.35} metalness={0.75} />
        </instancedMesh>
        {/* Padlock on the front. */}
        <group position={[0, 0.55, 1.04]}>
          <mesh castShadow>
            <boxGeometry args={[0.36, 0.3, 0.14]} />
            <meshStandardMaterial color="#f2c21b" roughness={0.35} metalness={0.4} />
          </mesh>
          <mesh position-y={0.17}>
            <torusGeometry args={[0.11, 0.03, 8, 16, Math.PI]} />
            <meshStandardMaterial color={PALETTE.metal} roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[0, -0.02, 0.072]}>
            <circleGeometry args={[0.04, 12]} />
            <meshBasicMaterial color="#3b2314" />
          </mesh>
        </group>
      </group>
    </group>
  )
}
