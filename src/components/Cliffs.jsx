import { useMemo } from 'react'
import { BLOCKS, CLIFFS, ROCKS } from '../data/world.js'
import { PALETTE, tileMaterial } from '../materials/tile.js'
import { boulder, grassCap, rockBlock, rockPillar } from '../utils/rockGeometry.js'

const CAP_H = 0.9 // m thick grass cap

function rockMaterial() {
  return tileMaterial({ top: PALETTE.rock, side: PALETTE.rock, mottle: 0.45, mottleScale: 1.4, roughness: 1, flatShading: true })
}

function capMaterial() {
  return tileMaterial({ top: PALETTE.grass, side: PALETTE.grassRim, mottle: 0.5, mottleScale: 1.6, roughness: 0.95, flatShading: true })
}

// A tall faceted rock pillar, flaring a little toward the top, with an
// overhanging grass cap. Origin at the base centre.
export function Cliff({ x, z, r, cap, h, seed, lean = [0, 0], children }) {
  const geo = useMemo(() => rockPillar(r * 1.12, r, h, seed), [r, h, seed])
  const capGeo = useMemo(() => grassCap(cap, CAP_H, seed + 1), [cap, seed])
  return (
    <group position={[x, 0, z]} rotation={[lean[0], 0, lean[1]]}>
      <mesh geometry={geo} material={rockMaterial()} position-y={h / 2} rotation-y={seed * 0.7} castShadow receiveShadow />
      <mesh geometry={capGeo} material={capMaterial()} position-y={h + CAP_H / 2 - 0.15} rotation-y={seed * 0.7} castShadow receiveShadow />
      <group position-y={h + CAP_H - 0.15}>{children}</group>
    </group>
  )
}

// Leaderboard on two posts, sitting on top of the west cliff.
function CliffBoard() {
  const wood = tileMaterial({ top: PALETTE.wood, mottle: 0.3, mottleScale: 0.5, roughness: 0.9 })
  return (
    <group position={[0.6, 0, -0.8]} rotation-y={Math.PI / 2 - 0.15}>
      {[-0.7, 0.7].map((px) => (
        <mesh key={px} position={[px, 0.9, 0]} material={wood} castShadow>
          <boxGeometry args={[0.18, 1.8, 0.18]} />
        </mesh>
      ))}
      <mesh position={[0, 2, 0]} material={wood} castShadow>
        <boxGeometry args={[2, 1.3, 0.15]} />
      </mesh>
      <mesh position={[0, 2, 0.08]}>
        <planeGeometry args={[1.8, 1.1]} />
        <meshStandardMaterial color="#2b2522" roughness={0.9} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[-0.15, 2.32 - i * 0.2, 0.09]}>
          <planeGeometry args={[1.1 - (i % 2) * 0.3, 0.07]} />
          <meshBasicMaterial color={i === 0 ? '#ffd34d' : '#d9d2c8'} />
        </mesh>
      ))}
    </group>
  )
}

// Cliffs, the terrace blocks along the NE rim and the grey boulders at the
// east cliff's foot.
export default function Cliffs() {
  const blockGeos = useMemo(() => BLOCKS.map((b, i) => rockBlock(...b.size, 40 + i)), [])
  const rockGeos = useMemo(() => ROCKS.map(([, , r], i) => boulder(r, 60 + i)), [])
  const stone = tileMaterial({ top: PALETTE.stone, side: '#6c6e75', mottle: 0.35, mottleScale: 0.6, roughness: 0.9, flatShading: true })

  return (
    <group>
      {CLIFFS.map((c, i) => (
        <Cliff key={i} {...c}>{i === 0 && <CliffBoard />}</Cliff>
      ))}
      {BLOCKS.map((b, i) => (
        <mesh
          key={i}
          geometry={blockGeos[i]}
          material={rockMaterial()}
          position={[Math.cos(b.angle) * b.r, b.size[1] / 2 - 0.05, Math.sin(b.angle) * b.r]}
          rotation-y={-b.angle + Math.PI / 2 + (i % 2 ? 0.08 : -0.06)}
          castShadow
          receiveShadow
        />
      ))}
      {ROCKS.map(([x, z, r], i) => (
        <mesh key={i} geometry={rockGeos[i]} material={stone} position={[x, r * 0.55, z]} rotation-y={i} castShadow receiveShadow />
      ))}
    </group>
  )
}
