import { GROUND_Y, ISLAND, PAD } from '../data/world.js'

// Floor height under (x, z): the swirl pad sits a few cm proud of the grass.
export function terrainHeightAt(x, z) {
  if (Math.hypot(x - PAD.x, z - PAD.z) <= PAD.radius) return PAD.top
  return GROUND_Y
}

// True once (x, z) is past the island rim (camera boom clamp).
export function isOutsideBounds(x, z) {
  return Math.hypot(x, z) > ISLAND.radius
}
