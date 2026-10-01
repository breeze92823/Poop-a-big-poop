import { useMemo } from 'react'
import { COLUMNS, NPCS, facePad } from '../data/world.js'
import { PALETTE, tileMaterial } from '../materials/tile.js'
import { boardTexture, pillLabelTexture } from '../utils/textures.js'

// White Ionic column: square plinth, fluted (20-sided, flat-shaded) shaft
// and a scrolled capital. Origin at the base centre, shaft along +Y.
function Column({ x, z, y = 0, rot = [0, 0, 0], height }) {
  const marble = tileMaterial({ top: '#f6f6f2', side: PALETTE.marble, mottle: 0.12, mottleScale: 0.8, roughness: 0.55, flatShading: true })
  const shaft = height - 0.85
  return (
    <group position={[x, y, z]} rotation={rot}>
      <mesh position-y={0.12} material={marble} castShadow receiveShadow>
        <boxGeometry args={[1.25, 0.24, 1.25]} />
      </mesh>
      <mesh position-y={0.34} material={marble} castShadow>
        <cylinderGeometry args={[0.56, 0.6, 0.2, 20]} />
      </mesh>
      <mesh position-y={0.44 + shaft / 2} material={marble} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.48, shaft, 20]} />
      </mesh>
      <mesh position-y={0.44 + shaft + 0.1} material={marble} castShadow>
        <cylinderGeometry args={[0.58, 0.44, 0.2, 20]} />
      </mesh>
      <mesh position-y={0.44 + shaft + 0.3} material={marble} castShadow>
        <boxGeometry args={[1.3, 0.22, 1.05]} />
      </mesh>
      {[-0.62, 0.62].map((vx) => (
        <mesh key={vx} position={[vx, 0.44 + shaft + 0.22, 0]} rotation-x={Math.PI / 2} material={marble} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 1.0, 12]} />
        </mesh>
      ))}
    </group>
  )
}

// Blocky brown reward-giver with an outstretched arm and a yellow-on-black
// tag floating overhead. Faces local +Z.
function Npc({ x, z, label }) {
  const skin = tileMaterial({ top: '#6a3a1e', side: PALETTE.npc, mottle: 0.15, mottleScale: 0.3, roughness: 0.85 })
  const tag = useMemo(() => pillLabelTexture(label), [label])
  return (
    <group position={[x, 0, z]} rotation-y={facePad(x, z)}>
      {[-0.25, 0.25].map((lx) => (
        <mesh key={lx} position={[lx, 0.48, 0]} material={skin} castShadow>
          <boxGeometry args={[0.48, 0.96, 0.5]} />
        </mesh>
      ))}
      <mesh position={[0, 1.44, 0]} material={skin} castShadow>
        <boxGeometry args={[1.0, 0.96, 0.5]} />
      </mesh>
      <mesh position={[-0.74, 1.44, 0]} material={skin} castShadow>
        <boxGeometry args={[0.46, 0.96, 0.48]} />
      </mesh>
      {/* Right arm held out toward the player. */}
      <group position={[0.74, 1.86, 0]} rotation-x={-1.25}>
        <mesh position={[0, -0.42, 0]} material={skin} castShadow>
          <boxGeometry args={[0.46, 0.96, 0.48]} />
        </mesh>
      </group>
      <mesh position={[0, 2.22, 0]} material={skin} castShadow>
        <cylinderGeometry args={[0.32, 0.32, 0.6, 12]} />
      </mesh>
      <mesh position={[0, 2.62, 0]} material={skin} castShadow>
        <coneGeometry args={[0.18, 0.3, 8]} />
      </mesh>
      <sprite position={[0, 3.25, 0]} scale={[3.1, 0.29, 1]}>
        <spriteMaterial map={tag} depthWrite={false} toneMapped={false} />
      </sprite>
    </group>
  )
}

// Big wooden notice board on a single thick post; the lettered side faces
// the pad, the back is bare planks.
function RewardBoard({ x, z, seed }) {
  const wood = tileMaterial({ top: PALETTE.woodLight, side: PALETTE.wood, mottle: 0.35, mottleScale: 0.5, roughness: 0.9 })
  const face = useMemo(() => boardTexture('DAILY REWARD', seed), [seed])
  return (
    <group position={[x, 0, z]} rotation-y={facePad(x, z)}>
      <mesh position={[0, 0.6, 0]} material={wood} castShadow>
        <boxGeometry args={[0.36, 1.2, 0.3]} />
      </mesh>
      <mesh position={[0, 1.7, 0]} material={wood} castShadow receiveShadow>
        <boxGeometry args={[2.4, 1.4, 0.2]} />
      </mesh>
      <mesh position={[0, 1.7, 0.101]}>
        <planeGeometry args={[2.2, 1.25]} />
        <meshStandardMaterial map={face} roughness={0.9} />
      </mesh>
    </group>
  )
}

export default function Landmarks() {
  return (
    <group>
      {COLUMNS.map((c, i) => <Column key={i} {...c} />)}
      {NPCS.map((n, i) => (
        <group key={i}>
          <Npc {...n} />
          <RewardBoard x={n.board[0]} z={n.board[1]} seed={i + 1} />
        </group>
      ))}
    </group>
  )
}
