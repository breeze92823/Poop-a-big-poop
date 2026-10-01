import { useMemo } from 'react'
import { BOOST_SIGN, FOOD_SIGN, MONEY_SIGN, POTTY, SIGNS, STALLS, VALUE_SIGN, facePad } from '../data/world.js'
import { PALETTE, tileMaterial } from '../materials/tile.js'
import {
  bigSignTexture,
  blockFaceTexture,
  outlineTagTexture,
  pottyDoorTexture,
  shirtTexture,
  signTexture,
  stripeTexture,
} from '../utils/textures.js'

const W = 3.2 // stall width
const D = 1.8 // stall depth

// Market stall: four grey poles, a wooden counter and a sloped striped
// awning with a short valance along the front. Front faces local +Z.
function Stall({ x, z, stripe }) {
  const pole = tileMaterial({ top: '#8d9096', roughness: 0.6, metalness: 0.3 })
  const wood = tileMaterial({ top: PALETTE.woodLight, side: PALETTE.wood, mottle: 0.3, mottleScale: 0.5, roughness: 0.9 })
  const map = useStripe(stripe)
  const poles = [
    [-W / 2, D / 2, 2.3],
    [W / 2, D / 2, 2.3],
    [-W / 2, -D / 2, 2.8],
    [W / 2, -D / 2, 2.8],
  ]
  return (
    <group position={[x, 0, z]} rotation-y={facePad(x, z)}>
      {poles.map(([px, pz, h], i) => (
        <mesh key={i} position={[px, h / 2, pz]} material={pole} castShadow>
          <cylinderGeometry args={[0.06, 0.06, h, 8]} />
        </mesh>
      ))}
      <mesh position={[0, 0.5, D / 2 - 0.35]} material={wood} castShadow receiveShadow>
        <boxGeometry args={[W - 0.1, 1, 0.6]} />
      </mesh>
      <mesh position={[0, 1.04, D / 2 - 0.3]} material={wood} castShadow>
        <boxGeometry args={[W + 0.1, 0.08, 0.8]} />
      </mesh>
      <mesh position={[0, 0.25, -D / 2 + 0.3]} material={wood} castShadow>
        <boxGeometry args={[W - 0.4, 0.5, 0.5]} />
      </mesh>
      {/* Awning, sloping down toward the front. */}
      <mesh position={[0, 2.62, 0]} rotation-x={Math.atan2(0.55, D)} castShadow>
        <boxGeometry args={[W + 0.4, 0.06, D + 0.5]} />
        <meshStandardMaterial map={map} roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.18, D / 2 + 0.25]} castShadow>
        <boxGeometry args={[W + 0.4, 0.32, 0.05]} />
        <meshStandardMaterial map={map} roughness={0.8} />
      </mesh>
    </group>
  )
}

// Muted grey-brown planks for the vendor stall and its sign.
const plankMaterial = (top = '#8c6e5e', side = '#7a5e4f') =>
  tileMaterial({ top, side, mottle: 0.25, mottleScale: 0.5, roughness: 0.9 })

function useStripe(stripe) {
  return useMemo(() => {
    const t = stripeTexture(stripe).clone()
    t.repeat.set(7, 1)
    t.needsUpdate = true
    return t
  }, [stripe])
}

// Shopkeeper outfits. `long` swaps the short quiff for shoulder-length,
// side-swept hair; `cap` covers the hair with a peaked officer's cap.
const LOOKS = {
  default: { skin: '#eac39a', shirt: '#43638c', sleeve: '#3d5b82', pants: '#2f405e', hair: '#3a2516' },
  ginger: { skin: '#f1cfa8', shirt: '#2e4566', sleeve: '#2a3f5e', pants: '#23324a', hair: '#d8692a', long: true },
  cap: { skin: '#eac39a', shirt: '#26334f', sleeve: '#222e48', pants: '#1f2a40', hair: '#2a1d14', cap: true },
}

// Hair boxes as [size, position, rotation].
const SHORT_HAIR = [
  [[0.48, 0.12, 0.48], [0, 2.05, -0.02]],
  [[0.48, 0.32, 0.1], [0, 1.88, -0.2]],
  [[0.16, 0.08, 0.14], [0.04, 2.13, 0.08], [0.4, 0, -0.3]],
]
// Only the back of the head shows under the cap.
const CAP_HAIR = [[[0.46, 0.22, 0.08], [0, 1.9, -0.2]]]
const LONG_HAIR = [
  [[0.5, 0.14, 0.5], [0, 2.06, -0.01]],
  [[0.3, 0.1, 0.32], [0.07, 2.12, 0.01], [0, 0, -0.22]],
  [[0.54, 0.58, 0.12], [0, 1.77, -0.22]],
  [[0.08, 0.42, 0.38], [-0.25, 1.85, -0.03]],
  [[0.08, 0.42, 0.38], [0.25, 1.85, -0.03]],
  [[0.32, 0.1, 0.08], [-0.09, 1.98, 0.22], [0, 0, 0.28]],
]

// Navy peaked cap: flat crown over a black band, a shiny peak and a small
// gold badge on the front.
function Cap() {
  return (
    <group>
      <mesh position={[0, 2.12, -0.01]} castShadow>
        <boxGeometry args={[0.52, 0.1, 0.52]} />
        <meshStandardMaterial color="#1e2638" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.03, 0]} castShadow>
        <boxGeometry args={[0.47, 0.09, 0.47]} />
        <meshStandardMaterial color="#111318" roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.0, 0.29]} rotation-x={0.25} castShadow>
        <boxGeometry args={[0.4, 0.03, 0.16]} />
        <meshStandardMaterial color="#0d0f14" roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.07, 0.237]}>
        <planeGeometry args={[0.08, 0.08]} />
        <meshStandardMaterial color="#e3b23c" metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  )
}

// Blocky shopkeeper (classic 0.4 m-per-stud proportions): printed shirt,
// dark jeans, head and hands in skin tone, hair, and a floating tag in
// `tagColor`. Faces +Z.
function Vendor({ label, tagColor, look = 'default' }) {
  const L = LOOKS[look]
  const shirt = useMemo(() => shirtTexture(L.shirt), [L])
  const face = useMemo(() => blockFaceTexture(L.skin), [L])
  const tag = useMemo(() => outlineTagTexture(label, tagColor), [label, tagColor])
  return (
    <group>
      {[-0.2, 0.2].map((lx) => (
        <mesh key={lx} position={[lx, 0.4, 0]} castShadow>
          <boxGeometry args={[0.39, 0.8, 0.4]} />
          <meshStandardMaterial color={L.pants} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[0.8, 0.8, 0.4]} />
        <meshStandardMaterial color={L.shirt} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.2, 0.201]}>
        <planeGeometry args={[0.8, 0.8]} />
        <meshStandardMaterial map={shirt} roughness={0.9} />
      </mesh>
      {[-0.6, 0.6].map((ax) => (
        <group key={ax} position={[ax, 0, 0]}>
          <mesh position={[0, 1.29, 0]} castShadow>
            <boxGeometry args={[0.39, 0.62, 0.4]} />
            <meshStandardMaterial color={L.sleeve} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.89, 0]} castShadow>
            <boxGeometry args={[0.39, 0.18, 0.4]} />
            <meshStandardMaterial color={L.skin} roughness={0.8} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.81, 0]} castShadow>
        <boxGeometry args={[0.44, 0.42, 0.42]} />
        <meshStandardMaterial color={L.skin} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.81, 0.211]}>
        <planeGeometry args={[0.44, 0.42]} />
        <meshStandardMaterial map={face} roughness={0.8} />
      </mesh>
      {(L.cap ? CAP_HAIR : L.long ? LONG_HAIR : SHORT_HAIR).map(([size, pos, rot], i) => (
        <mesh key={i} position={pos} rotation={rot} castShadow>
          <boxGeometry args={size} />
          <meshStandardMaterial color={L.hair} roughness={0.95} />
        </mesh>
      ))}
      {L.cap && <Cap />}
      {/* Drawn over the awning so the raised game camera can still read it. */}
      <sprite position={[0, 2.36, 0]} scale={[1.2, 0.375, 1]} renderOrder={10}>
        <spriteMaterial map={tag} depthTest={false} depthWrite={false} toneMapped={false} fog={false} />
      </sprite>
    </group>
  )
}

// Vendor stall: four square wooden posts with beams, a flat striped awning
// tipped toward the front, a two-plank fence with a grey counter rail on top
// and a shopkeeper standing behind it. Front faces local +Z.
function VendorStall({ x, z, stripe, vendor, tag, look }) {
  const wood = plankMaterial()
  const rail = tileMaterial({ top: '#8f9298', side: '#7c7f86', roughness: 0.6 })
  const map = useStripe(stripe)
  const hf = 2.35 // front post height
  const hb = 2.75 // back post height
  const slope = Math.atan2(hb - hf, D)
  const posts = [
    [-W / 2, D / 2, hf],
    [W / 2, D / 2, hf],
    [-W / 2, -D / 2, hb],
    [W / 2, -D / 2, hb],
  ]
  return (
    <group position={[x, 0, z]} rotation-y={facePad(x, z)}>
      {posts.map(([px, pz, h], i) => (
        <mesh key={i} position={[px, h / 2, pz]} material={wood} castShadow receiveShadow>
          <boxGeometry args={[0.18, h, 0.18]} />
        </mesh>
      ))}
      {/* Beams under the awning. */}
      <mesh position={[0, hf - 0.08, D / 2]} material={wood} castShadow>
        <boxGeometry args={[W + 0.18, 0.16, 0.16]} />
      </mesh>
      <mesh position={[0, hb - 0.08, -D / 2]} material={wood} castShadow>
        <boxGeometry args={[W + 0.18, 0.16, 0.16]} />
      </mesh>
      {[-W / 2, W / 2].map((bx) => (
        <mesh key={bx} position={[bx, (hf + hb) / 2 - 0.08, 0]} rotation-x={slope} material={wood} castShadow>
          <boxGeometry args={[0.14, 0.14, D + 0.1]} />
        </mesh>
      ))}
      {/* Awning: thick striped slab with a striped front edge. */}
      <mesh position={[0, (hf + hb) / 2 + 0.06, 0]} rotation-x={slope} castShadow receiveShadow>
        <boxGeometry args={[W + 0.6, 0.12, D + 0.6]} />
        <meshStandardMaterial map={map} roughness={0.8} />
      </mesh>
      {/* Front fence: two planks across, one plank down each side. */}
      {[0.3, 0.7].map((py) => (
        <mesh key={py} position={[0, py, D / 2 + 0.13]} material={wood} castShadow receiveShadow>
          <boxGeometry args={[W + 0.1, 0.3, 0.07]} />
        </mesh>
      ))}
      {[-W / 2 - 0.12, W / 2 + 0.12].flatMap((sx) =>
        [0.3, 0.7].map((py) => (
          <mesh key={`${sx}-${py}`} position={[sx, py, 0]} material={wood} castShadow>
            <boxGeometry args={[0.07, 0.3, D]} />
          </mesh>
        )),
      )}
      <mesh position={[0, 0.94, D / 2 + 0.06]} material={rail} castShadow receiveShadow>
        <boxGeometry args={[W + 0.7, 0.08, 0.34]} />
      </mesh>
      <group position={[0, 0, -0.15]}>
        <Vendor label={vendor} tagColor={tag} look={look} />
      </group>
    </group>
  )
}

// Big painted board ("MAKE MONEY", "INCREASE POOP VALUE", "SAVE FOOD EFFECTS"): chunky plank
// panel, slightly crooked and leaning back, on one thick post behind it.
// `turn` angles it toward its stall; `board` recolours the panel.
function BigSign({ x, z, lines, turn, board, ink }) {
  const wood = board ? plankMaterial(board, board) : plankMaterial()
  const face = useMemo(() => bigSignTexture(lines, board, ink), [lines, board, ink])
  return (
    <group position={[x, 0, z]} rotation-y={facePad(x, z) + turn}>
      <mesh position={[0, 1.0, -0.24]} material={wood} castShadow receiveShadow>
        <boxGeometry args={[0.34, 2.0, 0.26]} />
      </mesh>
      <group position={[0, 1.8, 0]} rotation={[-0.08, 0, -0.06]}>
        <mesh material={wood} castShadow receiveShadow>
          <boxGeometry args={[2.56, 1.8, 0.22]} />
        </mesh>
        <mesh position={[0, 0, 0.111]}>
          <planeGeometry args={[2.42, 1.66]} />
          <meshStandardMaterial map={face} roughness={0.9} />
        </mesh>
      </group>
    </group>
  )
}

// Wooden porta-potty: tan box, darker overhanging roof, door with a moon vent.
function Potty({ x, z }) {
  const body = tileMaterial({ top: PALETTE.potty, side: PALETTE.potty, mottle: 0.25, mottleScale: 0.6, roughness: 0.85 })
  const roof = tileMaterial({ top: PALETTE.pottyRoof, side: '#734a2c', roughness: 0.85 })
  const door = useMemo(() => pottyDoorTexture(), [])
  return (
    <group position={[x, 0, z]} rotation-y={facePad(x, z)}>
      <mesh position={[0, 1.15, 0]} material={body} castShadow receiveShadow>
        <boxGeometry args={[1.3, 2.3, 1.3]} />
      </mesh>
      <mesh position={[0, 2.4, 0]} material={roof} castShadow>
        <boxGeometry args={[1.5, 0.22, 1.5]} />
      </mesh>
      <mesh position={[0, 2.56, 0]} material={roof} castShadow>
        <boxGeometry args={[1.1, 0.12, 1.1]} />
      </mesh>
      <mesh position={[0, 1.1, 0.66]}>
        <planeGeometry args={[1.0, 2.0]} />
        <meshStandardMaterial map={door} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.06, 0]} material={roof}>
        <boxGeometry args={[1.42, 0.12, 1.42]} />
      </mesh>
    </group>
  )
}

// Picket sign: one post, a small lettered board facing the pad.
function Sign({ x, z, text }) {
  const wood = tileMaterial({ top: PALETTE.wood, mottle: 0.3, mottleScale: 0.5, roughness: 0.9 })
  const map = useMemo(() => signTexture(text), [text])
  return (
    <group position={[x, 0, z]} rotation-y={facePad(x, z)}>
      <mesh position={[0, 0.5, 0]} material={wood} castShadow>
        <boxGeometry args={[0.1, 1, 0.1]} />
      </mesh>
      <mesh position={[0, 1, 0.06]} castShadow>
        <boxGeometry args={[0.8, 0.4, 0.05]} />
        <meshStandardMaterial map={map} roughness={0.9} />
      </mesh>
    </group>
  )
}

const MONEY_LINES = ['MAKE', 'MONEY']
const VALUE_LINES = ['INCREASE', 'POOP VALUE']
const BOOST_LINES = ['DAILY', 'SIZE BOOST']
const FOOD_LINES = ['SAVE FOOD', 'EFFECTS']

export default function Market() {
  return (
    <group>
      {STALLS.map((s, i) => (s.vendor ? <VendorStall key={i} {...s} /> : <Stall key={i} {...s} />))}
      <BigSign {...MONEY_SIGN} lines={MONEY_LINES} turn={-0.35} />
      <BigSign {...VALUE_SIGN} lines={VALUE_LINES} turn={0.35} />
      <BigSign {...BOOST_SIGN} lines={BOOST_LINES} turn={-0.15} board="#4a3329" ink="#f5d63a" />
      <BigSign {...FOOD_SIGN} lines={FOOD_LINES} turn={0.35} ink="#3fd6b8" />
      <Potty {...POTTY} />
      {SIGNS.map((s, i) => <Sign key={i} {...s} text={i ? 'SHOP' : 'SELL'} />)}
    </group>
  )
}
