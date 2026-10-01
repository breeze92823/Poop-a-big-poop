import { ConeGeometry, SphereGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// One soft-serve poop, 1 m wide at the base: three squashed, shrinking
// spheres and a curled cone tip, merged into a single geometry. Origin at
// the bottom centre. Built once and shared.
let geometry = null

export function poopGeometry() {
  if (geometry) return geometry
  const tiers = [
    [0.5, 0.22, 0],
    [0.37, 0.52, 0.03],
    [0.24, 0.76, -0.02],
  ].map(([r, y, x]) => {
    const g = new SphereGeometry(r, 18, 12)
    g.scale(1, 0.62, 1)
    g.translate(x, y, 0)
    return g
  })
  const tip = new ConeGeometry(0.14, 0.3, 12)
  tip.rotateZ(-0.5)
  tip.translate(0.05, 0.95, 0)
  geometry = mergeGeometries([...tiers, tip])
  geometry.computeBoundingSphere()
  return geometry
}
