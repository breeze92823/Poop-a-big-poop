import { useMemo } from 'react'
import { BUSHES, TREES } from '../data/world.js'
import { PALETTE, tileMaterial } from '../materials/tile.js'
import { seededRandom } from '../utils/random.js'

// Bare, leafless tree: a seeded branching skeleton of tapered cylinders.
function makeBranch(rand, len, radius, depth) {
  const kids = []
  if (depth > 0) {
    const n = depth === 3 ? 3 : 2 + (rand() < 0.4 ? 1 : 0)
    for (let i = 0; i < n; i++) {
      kids.push({
        at: 0.55 + rand() * 0.45,
        yaw: (i / n) * Math.PI * 2 + rand() * 1.2,
        tilt: 0.35 + rand() * 0.45,
        branch: makeBranch(rand, len * (0.55 + rand() * 0.2), radius * 0.62, depth - 1),
      })
    }
  }
  return { len, radius, kids }
}

function Branch({ len, radius, kids, material }) {
  return (
    <>
      <mesh position-y={len / 2} material={material} castShadow>
        <cylinderGeometry args={[radius * 0.62, radius, len, 6]} />
      </mesh>
      {kids.map((k, i) => (
        <group key={i} position-y={len * k.at} rotation-y={k.yaw}>
          <group rotation-x={k.tilt}>
            <Branch {...k.branch} material={material} />
          </group>
        </group>
      ))}
    </>
  )
}

export function BareTree({ x, z, rot = 0, seed = 1, scale = 1 }) {
  const spec = useMemo(() => makeBranch(seededRandom(seed), 2.2, 0.2, 3), [seed])
  const bark = tileMaterial({ top: PALETTE.bark, side: PALETTE.bark, mottle: 0.3, mottleScale: 0.4, roughness: 1, flatShading: true })
  return (
    <group position={[x, 0, z]} rotation={[0.06, rot, -0.05]} scale={scale}>
      <Branch {...spec} material={bark} />
    </group>
  )
}

// Leafy bush: overlapping faceted blobs, lighter on top.
export function Bush({ x, z, size = 1.4, seed = 1 }) {
  const blobs = useMemo(() => {
    const rand = seededRandom(seed * 13 + 1)
    const out = [[0, 0.55, 0, 0.75]]
    const n = 6
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand() * 0.6
      const d = 0.5 + rand() * 0.25
      out.push([Math.cos(a) * d, 0.35 + rand() * 0.25, Math.sin(a) * d, 0.45 + rand() * 0.2])
    }
    out.push([0.15, 0.95, -0.1, 0.45], [-0.25, 0.85, 0.2, 0.4])
    return out
  }, [seed])
  const leaf = tileMaterial({ top: PALETTE.leafLight, side: PALETTE.leaf, mottle: 0.8, mottleScale: 0.3, speckle: 2, roughness: 0.95, flatShading: true })
  return (
    <group position={[x, 0, z]} scale={size}>
      {blobs.map(([bx, by, bz, r], i) => (
        <mesh key={i} position={[bx, by, bz]} material={leaf} castShadow receiveShadow>
          <icosahedronGeometry args={[r, 1]} />
        </mesh>
      ))}
    </group>
  )
}

export default function Vegetation() {
  return (
    <group>
      {TREES.map((t, i) => (
        <group key={i}>
          <BareTree {...t} />
          {t.bush && <Bush x={t.bush[0]} z={t.bush[1]} size={1.6} seed={t.seed} />}
        </group>
      ))}
      {BUSHES.map(([x, z, size], i) => (
        <Bush key={i} x={x} z={z} size={size} seed={i + 5} />
      ))}
    </group>
  )
}
