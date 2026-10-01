import { BoxGeometry, CylinderGeometry, IcosahedronGeometry } from 'three'
import { seededRandom } from './random.js'

// Low-poly "carved block" shapes for the cliffs: three primitives whose
// vertices are nudged by a seeded, position-keyed offset, so coincident
// vertices (seams, cap rims) move together and the mesh stays watertight.
// Pair with a flatShading material for the faceted Roblox-rock look.
function jitter(geometry, seed, amount, { keepY = false, keepBottom = false } = {}) {
  const pos = geometry.attributes.position
  const offsets = new Map()
  const rand = seededRandom(seed)
  geometry.computeBoundingBox()
  const minY = geometry.boundingBox.min.y
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`
    let o = offsets.get(key)
    if (!o) {
      o = [(rand() - 0.5) * 2 * amount, (rand() - 0.5) * 2 * amount, (rand() - 0.5) * 2 * amount]
      offsets.set(key, o)
    }
    const pinned = keepBottom && Math.abs(y - minY) < 1e-4
    pos.setXYZ(i, x + o[0], keepY || pinned ? y : y + o[1], z + o[2])
  }
  geometry.computeVertexNormals()
  return geometry
}

export function rockPillar(rTop, rBottom, height, seed, { segments = 7, rings = 3, amount } = {}) {
  const g = new CylinderGeometry(rTop, rBottom, height, segments, rings)
  return jitter(g, seed, amount ?? Math.min(rTop, rBottom) * 0.12, { keepBottom: true })
}

export function grassCap(radius, height, seed, segments = 8) {
  const g = new CylinderGeometry(radius, radius * 0.92, height, segments, 1)
  return jitter(g, seed, radius * 0.08, { keepY: true })
}

export function rockBlock(w, h, d, seed) {
  return jitter(new BoxGeometry(w, h, d, 2, 1, 2), seed, Math.min(w, h, d) * 0.08, { keepBottom: true })
}

export function boulder(radius, seed) {
  return jitter(new IcosahedronGeometry(radius, 0), seed, radius * 0.18)
}
