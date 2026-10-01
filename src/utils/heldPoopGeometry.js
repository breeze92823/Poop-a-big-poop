import { BoxGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// The poop as carried overhead: a wide row of overlapping chunky slabs, ~2 m
// across, in the blocky look of the reference image. Origin at the bottom
// centre. Deterministic (no randomness) and shared.
// [x, width, height, depth, yaw] — heights/offsets are staggered so the slabs
// read as separate lumps rather than one bar.
const CHUNKS = [
  [-0.86, 0.5, 0.52, 0.55, 0.05],
  [-0.58, 0.42, 0.44, 0.5, -0.04],
  [-0.3, 0.5, 0.56, 0.58, 0.03],
  [-0.02, 0.4, 0.46, 0.5, -0.05],
  [0.26, 0.5, 0.58, 0.58, 0.04],
  [0.52, 0.4, 0.46, 0.5, -0.03],
  [0.82, 0.5, 0.54, 0.55, 0.05],
]

let geometry = null

export function heldPoopGeometry() {
  if (geometry) return geometry
  const parts = CHUNKS.map(([x, w, h, d, yaw], i) => {
    const g = new BoxGeometry(w, h, d)
    g.rotateY(yaw)
    g.translate(x, h / 2 + (i % 2) * 0.03, 0)
    return g
  })
  geometry = mergeGeometries(parts)
  geometry.computeBoundingSphere()
  return geometry
}
