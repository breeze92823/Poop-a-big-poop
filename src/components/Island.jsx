import { useMemo } from 'react'
import { ISLAND, PAD } from '../data/world.js'
import { PALETTE, tileMaterial } from '../materials/tile.js'
import { padTexture } from '../utils/textures.js'

const RIM = 0.55 // m of grass lip wrapping over the top of the dirt wall

// The floating island: a faceted 20-sided slab (grass on top, reddish dirt
// walls tapering slightly toward the bottom), a darker grass lip around the
// rim, and the swirl pad in the middle.
export default function Island() {
  const { radius, bottomRadius, depth, sides } = ISLAND
  const taper = (radius - bottomRadius) / depth
  const grass = tileMaterial({ top: PALETTE.grass, side: PALETTE.dirt, side2: PALETTE.dirt2, mottle: 0.55, mottleScale: 2.6, speckle: 1.2, roughness: 0.95, flatShading: true })
  const dirt = tileMaterial({ top: PALETTE.dirt, side: PALETTE.dirt, mottle: 0.5, mottleScale: 1.8, roughness: 1, flatShading: true })
  const rim = tileMaterial({ top: PALETTE.grassRim, side: PALETTE.grassRim, mottle: 0.4, mottleScale: 1.2, roughness: 0.95, flatShading: true })
  const padSide = tileMaterial({ top: '#c8c8c8', roughness: 0.8 })
  const padMap = useMemo(() => padTexture(), [])

  return (
    <group>
      <mesh position={[0, -0.3, 0]} material={grass} receiveShadow>
        <cylinderGeometry args={[radius, radius - taper * 0.6, 0.6, sides]} />
      </mesh>
      <mesh position={[0, -0.6 - (depth - 0.6) / 2, 0]} material={dirt} castShadow receiveShadow>
        <cylinderGeometry args={[radius - taper * 0.6, bottomRadius, depth - 0.6, sides, 3]} />
      </mesh>
      <mesh position={[0, -RIM / 2 + 0.01, 0]} material={rim}>
        <cylinderGeometry args={[radius + 0.04, radius + 0.04 - taper * RIM, RIM, sides, 1, true]} />
      </mesh>

      <group position={[PAD.x, 0, PAD.z]}>
        <mesh position={[0, PAD.top / 2, 0]} material={padSide} receiveShadow>
          <cylinderGeometry args={[PAD.radius, PAD.radius + 0.05, PAD.top, 64]} />
        </mesh>
        <mesh position={[0, PAD.top + 0.002, 0]} rotation-x={-Math.PI / 2} receiveShadow>
          <circleGeometry args={[PAD.radius, 64]} />
          <meshStandardMaterial map={padMap} roughness={0.85} />
        </mesh>
      </group>
    </group>
  )
}
