// World layout for the poop island, in metres. +X is east, +Z south, Y up.
// Mapped from the reference shots (top-down = north up): a floating
// 20-sided grass island with a swirl pad in the middle.
//
//                 bare tree + bush (N rim)
//            [buy stall] [potty] [sell stall]
//                                            brown blocks (NE rim)
//   board+NPC                                  [EAST CLIFF] fallen column
//   [WEST CLIFF]          ( swirl pad )         short pillar, rocks
//   column, bush                                 (chained jar, SE)
//         board+NPC                    [boost stall] boost sign
//                 bare tree + bush (S rim)     tree + bush
export const GROUND_Y = 0

export const ISLAND = {
  radius: 26, // top rim, vertex radius of the 20-gon
  bottomRadius: 23.5,
  depth: 8, // dirt cliff below the grass
  sides: 20,
  rimInset: 0.6, // player keeps this far inside the rim
}

export const PAD = { x: 0, z: -1.5, radius: 7, top: 0.06 }

export const SPAWN = { x: 0, y: PAD.top, z: 3 }
export const SPAWN_FACING = Math.PI // face north, toward the stalls

export const PLAYER_MOVE_SPEED = 7

// Tile-shader grout half-width (materials/tile.js), in metres.
export const GROUT = 0.05

// Rock pillars with a grass cap. `r` is the base radius, `cap` the cap radius.
export const CLIFFS = [
  { x: -23.2, z: 2.6, r: 4.2, cap: 5.4, h: 10, seed: 3, lean: [0.03, -0.04] }, // west, board on top
  { x: 21.8, z: -8.6, r: 4.4, cap: 5.6, h: 11, seed: 7, lean: [-0.04, 0.02] }, // east, tall
  { x: 21.2, z: -2.6, r: 2.4, cap: 3, h: 4.6, seed: 11, lean: [0, 0.05] }, // east, short step
]

// Wide brown terrace blocks hugging the NE rim, north of the east cliff.
export const BLOCKS = [-35, -42, -49, -56].map((deg, i) => ({
  angle: (deg * Math.PI) / 180,
  r: 23.6,
  size: [3.4, 2.4 + (i % 2) * 0.4, 2.6],
}))

export const STALLS = [
  // BUY stall (Increase Poop Value): red/white food stand: green tag, long-haired ginger shopkeeper in navy
  { x: -7.1, z: -14, stripe: '#e8323a', vendor: 'BUY FOOD', tag: '#7ae35a', look: 'ginger' },
  { x: 4.9, z: -13.7, stripe: '#3d8fe0', vendor: 'SELL POOP' }, // SELL stall (Make Money): blue/white, plank fence + vendor
  // DAILY SIZE BOOST stall: yellow/white stand, south-east of the pad: shopkeeper in a peaked cap
  { x: 13, z: 11.5, stripe: '#f2c81c', vendor: 'SIZE BOOST', tag: '#f5d63a', look: 'cap' },
  // SAVE FOOD EFFECT stall: teal/white stand, beside the Daily Reward NPC
  { x: -10.5, z: 9.5, stripe: '#25b89a', vendor: '24 HOURS ONLY', tag: '#3fd6b8', look: 'ginger' },
]
// Big "INCREASE POOP VALUE" board beside the Buy Stall, on its west side.
export const VALUE_SIGN = { x: -9.4, z: -11.2 }
// Big "MAKE MONEY" board beside the Sell Stall, on the pad side of it.
export const MONEY_SIGN = { x: 8.5, z: -12.6 }
// Big teal-lettered "SAVE FOOD EFFECTS" board beside the Save Food Effect Stall, on its
// south-east side, level with the stall like the Boost Sign.
export const FOOD_SIGN = { x: -8.3, z: 11.6 }
// Dark "DAILY SIZE BOOST" board on the pad-facing right of the Daily Size Boost Stall.
export const BOOST_SIGN = { x: 10.5, z: 13.4 }
export const POTTY = { x: -1.1, z: -15.6 }

// Bare tree + leafy bush pairs.
export const TREES = [
  { x: -4, z: -22, rot: 0.3, seed: 21, bush: [-1.2, -20.6] }, // north rim
  { x: 0.2, z: 20.4, rot: 2.1, seed: 33, bush: [3.2, 19] }, // south rim
  { x: 9.3, z: 17.1, rot: 1.2, seed: 45, bush: [10.4, 15.6] }, // behind the Boost Sign
]
export const BUSHES = [
  [-19.4, 6.8, 1.5],
  [16.4, -11.4, 1.5],
  [25, 1, 1.4],
  [-25.2, -1.4, 1.2],
]

export const COLUMNS = [
  { x: -19.9, z: 5, rot: [0.05, 0, -0.08], height: 5.2 }, // standing, west
  { x: 13.9, z: -6.6, rot: [0.12, 0, -1.0], height: 4.6, y: 0.2 }, // toppled, leaning on the east cliff
]
export const ROCKS = [
  [16.9, -5, 0.9],
  [17.9, -4.1, 0.6],
  [15.8, -5.9, 0.55],
]

// Daily-reward NPCs (brown blocky figure + wooden board beside it). Stalls,
// the potty, signs and NPCs all turn to face the pad (see facePad).
export const NPCS = [
  { x: -16.6, z: 9.8, label: 'CLAIM ONCE PER 24 HOURS', board: [-14.8, 11.2] },
]

// Small picket signs between the stalls.
export const SIGNS = [
  { x: 1.8, z: -14.4 },
  { x: -4.2, z: -14.6 },
]

export const JAR = { x: 19.2, z: 2.6 }
export const JAR_SCALE = 2 // jar model, label and effects are built at 1x and scaled

// Gold-trimmed treasure chest south of the pad, halfway between the Save Food
// Effect Stall and the Daily Size Boost Stall. Built at 1x and scaled.
// Master switch: false hides the chest (not drawn, no E zone, no collision). Keep == the backend's
// CHEST_ENABLED (constants.ts), which refuses `openChest` while it is off.
export const CHEST_ENABLED = true
export const CHEST = { x: 1.2, z: 11.5 }
export const CHEST_SCALE = 3

// "Press E to ..." zones: hold E within `r` metres of (x, z) to trigger
// (systems/interact.js). `prompt` is the label after the E keycap.
export const INTERACTS = [
  { id: 'buy', x: STALLS[0].x, z: STALLS[0].z, r: 3.6, prompt: 'Buy Food' },
  { id: 'sell', x: STALLS[1].x, z: STALLS[1].z, r: 3.6, prompt: 'Sell Poop' },
  { id: 'boost', x: STALLS[2].x, z: STALLS[2].z, r: 3.6, prompt: 'Claim Size Boost' },
  { id: 'foodFx', x: STALLS[3].x, z: STALLS[3].z, r: 3.6, prompt: 'Save Food Effects' },
  { id: 'reward', x: NPCS[0].x, z: NPCS[0].z, r: 2.6, prompt: 'Claim Reward' },
  ...(CHEST_ENABLED ? [{ id: 'chest', x: CHEST.x, z: CHEST.z, r: 5.2, prompt: 'Open Chest · Free' }] : []),
  { id: 'jar', x: JAR.x, z: JAR.z, r: 2.8 * JAR_SCALE, prompt: 'Open Jar' },
]

// Yaw that turns a model's +Z front toward the pad centre.
export function facePad(x, z) {
  return Math.atan2(PAD.x - x, PAD.z - z)
}

// Circles the player can't walk through: [x, z, radius].
export const OBSTACLES = [
  ...CLIFFS.map((c) => [c.x, c.z, c.r * 0.95]),
  ...BLOCKS.map((b) => [Math.cos(b.angle) * b.r, Math.sin(b.angle) * b.r, 1.6]),
  ...STALLS.map((s) => [s.x, s.z, s.vendor ? 2 : 1.8]),
  [VALUE_SIGN.x, VALUE_SIGN.z, 0.5],
  [MONEY_SIGN.x, MONEY_SIGN.z, 0.5],
  [FOOD_SIGN.x, FOOD_SIGN.z, 0.5],
  [BOOST_SIGN.x, BOOST_SIGN.z, 0.5],
  [POTTY.x, POTTY.z, 0.9],
  [JAR.x, JAR.z, 1.3 * JAR_SCALE],
  ...(CHEST_ENABLED ? [[CHEST.x, CHEST.z, 0.95 * CHEST_SCALE]] : []),
  ...TREES.map((t) => [t.x, t.z, 0.35]),
  ...COLUMNS.slice(0, 1).map((c) => [c.x, c.z, 0.7]),
  ...ROCKS.map(([x, z, r]) => [x, z, r]),
  ...NPCS.flatMap((n) => [[n.x, n.z, 0.6], [n.board[0], n.board[1], 0.6]]),
]
