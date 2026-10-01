import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry } from 'three'

// Procedural 3D food for the held-item pose, one per FOODS id (systems/shop.js).
// Each is ~0.5 m tall with its origin at the bottom centre, like the held poop.
// Built once per id and shared; callers must not dispose them.
const mat = (color, extra) => new MeshStandardMaterial({ color, roughness: 0.6, ...extra })
const part = (geo, color, pos = [0, 0, 0], rot = [0, 0, 0], extra) => {
  const m = new Mesh(geo, mat(color, extra))
  m.position.set(...pos)
  m.rotation.set(...rot)
  m.castShadow = true
  return m
}

const BUILDERS = {
  lettuce: (g) => {
    g.add(part(new SphereGeometry(0.26, 14, 10), '#5fbf4a', [0, 0.26, 0]))
    g.add(part(new SphereGeometry(0.2, 12, 8), '#8be06a', [0.1, 0.34, 0.08]))
    g.add(part(new SphereGeometry(0.16, 12, 8), '#4a9f3a', [-0.12, 0.3, -0.1]))
  },
  donut: (g) => {
    g.add(part(new TorusGeometry(0.2, 0.1, 12, 24), '#d9a066', [0, 0.3, 0], [Math.PI / 2, 0, 0]))
    g.add(part(new TorusGeometry(0.2, 0.075, 12, 24), '#e8e9ee', [0, 0.35, 0], [Math.PI / 2, 0, 0]))
  },
  hotsauce: (g) => {
    g.add(part(new CylinderGeometry(0.1, 0.12, 0.34, 14), '#c8321a', [0, 0.17, 0]))
    g.add(part(new CylinderGeometry(0.05, 0.1, 0.1, 12), '#c8321a', [0, 0.39, 0]))
    g.add(part(new CylinderGeometry(0.06, 0.06, 0.07, 12), '#f4f4f4', [0, 0.47, 0]))
  },
  cola: (g) => {
    g.add(part(new CylinderGeometry(0.11, 0.09, 0.3, 14), '#e4e0d8', [0, 0.15, 0]))
    g.add(part(new CylinderGeometry(0.115, 0.115, 0.06, 14), '#d62d2d', [0, 0.32, 0]))
    g.add(part(new CylinderGeometry(0.012, 0.012, 0.18, 6), '#ffffff', [0.03, 0.42, 0], [0, 0, -0.2]))
  },
  banana: (g) => {
    for (let i = 0; i < 5; i++) {
      const a = (i - 2) * 0.28
      g.add(part(new BoxGeometry(0.14, 0.14, 0.14), '#f2d23a', [Math.sin(a) * 0.3, 0.1 + (1 - Math.cos(a)) * 0.5, 0], [0, 0, -a]))
    }
  },
  milk: (g) => {
    g.add(part(new BoxGeometry(0.22, 0.34, 0.22), '#f4f1e6', [0, 0.17, 0]))
    g.add(part(new BoxGeometry(0.22, 0.1, 0.12), '#f4f1e6', [0, 0.39, 0], [0.5, 0, 0]))
    g.add(part(new BoxGeometry(0.23, 0.12, 0.23), '#4a8fe0', [0, 0.18, 0]))
  },
  goldapple: (g) => {
    g.add(part(new SphereGeometry(0.22, 16, 12), '#f0b92a', [0, 0.22, 0], [0, 0, 0], { metalness: 0.7, roughness: 0.3 }))
    g.add(part(new CylinderGeometry(0.015, 0.015, 0.1, 6), '#6b4a22', [0, 0.46, 0]))
    g.add(part(new SphereGeometry(0.06, 8, 6), '#4fa83a', [0.06, 0.47, 0]))
  },
  energy: (g) => {
    g.add(part(new CylinderGeometry(0.1, 0.1, 0.34, 14), '#37d6ff', [0, 0.17, 0], [0, 0, 0], { metalness: 0.5, roughness: 0.35 }))
    g.add(part(new CylinderGeometry(0.1, 0.1, 0.03, 14), '#c8ccd4', [0, 0.355, 0], [0, 0, 0], { metalness: 0.8 }))
    g.add(part(new BoxGeometry(0.1, 0.12, 0.02), '#1a1a2e', [0, 0.17, 0.1]))
  },
  pizza: (g) => {
    const slice = (parent) => {
      parent.add(part(new BoxGeometry(0.34, 0.04, 0.42), '#e8b45a', [0, 0.02, 0]))
      parent.add(part(new BoxGeometry(0.28, 0.02, 0.34), '#d9d4ff', [0, 0.05, 0]))
      for (const [x, z] of [[-0.06, 0.05], [0.07, -0.05], [0, -0.14]]) {
        parent.add(part(new CylinderGeometry(0.035, 0.035, 0.02, 10), '#b03a2e', [x, 0.07, z]))
      }
    }
    const s = new Group()
    slice(s)
    s.position.y = 0.2
    s.rotation.x = -0.5
    g.add(s)
  },
}

const cache = new Map()

export function heldFoodModel(id) {
  if (cache.has(id)) return cache.get(id)
  const g = new Group()
  ;(BUILDERS[id] || BUILDERS.lettuce)(g)
  cache.set(id, g)
  return g
}
