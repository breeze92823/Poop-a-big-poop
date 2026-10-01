import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import { seededRandom } from './random.js'
import { LABEL_FONT } from './labelCanvas.js'

// Procedural canvas textures for the island props. Each is built once and
// cached by key; callers share the returned CanvasTexture.
const cache = new Map()

function canvasTexture(key, w, h, draw, { repeat = false } = {}) {
  if (cache.has(key)) return cache.get(key)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  draw(canvas.getContext('2d'), w, h)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  if (repeat) texture.wrapS = texture.wrapT = RepeatWrapping
  cache.set(key, texture)
  return texture
}

// Spawn pad seen from above (canvas top = north): pale concrete disc, a dark
// ring just inside the rim and a three-tier soft-serve swirl in line art.
export function padTexture() {
  return canvasTexture('pad', 1024, 1024, (ctx, S) => {
    const c = S / 2
    const R = S / 2
    const rand = seededRandom(5)
    ctx.fillStyle = '#cdcdcf'
    ctx.beginPath()
    ctx.arc(c, c, R, 0, Math.PI * 2)
    ctx.fill()
    // Faint concrete grain.
    for (let i = 0; i < 2600; i++) {
      const a = rand() * Math.PI * 2
      const r = Math.sqrt(rand()) * R
      ctx.fillStyle = rand() < 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.05)'
      ctx.fillRect(c + Math.cos(a) * r, c + Math.sin(a) * r, 3 + rand() * 6, 3 + rand() * 6)
    }

    const line = '#a2a2a2'
    ctx.strokeStyle = line
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = S * 0.028
    ctx.beginPath()
    ctx.arc(c, c, R * 0.9, 0, Math.PI * 2)
    ctx.stroke()

    // Swirl tiers, bottom to top: each one is filled with the pad colour
    // first so it hides the outline of the tier beneath — classic line art.
    const u = (v) => c + v * R
    const tier = (cx, cy, rx, ry) => {
      ctx.beginPath()
      ctx.ellipse(u(cx), u(cy), rx * R, ry * R, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#cdcdcf'
      ctx.fill()
      ctx.stroke()
    }
    ctx.lineWidth = S * 0.022
    tier(0, 0.36, 0.6, 0.25)
    tier(0.02, 0.07, 0.45, 0.2)
    tier(-0.01, -0.2, 0.3, 0.15)
    // Curled tip.
    ctx.beginPath()
    ctx.moveTo(u(-0.16), u(-0.29))
    ctx.bezierCurveTo(u(-0.14), u(-0.5), u(0.12), u(-0.58), u(0.12), u(-0.44))
    ctx.bezierCurveTo(u(0.12), u(-0.36), u(0.02), u(-0.36), u(0.04), u(-0.42))
    ctx.fillStyle = '#cdcdcf'
    ctx.fill()
    ctx.stroke()
  })
}

// Market awning canvas: vertical colour/white stripes, tiled along U.
export function stripeTexture(color) {
  return canvasTexture(`stripe-${color}`, 256, 64, (ctx, w, h) => {
    ctx.fillStyle = '#f7f4ef'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = color
    ctx.fillRect(0, 0, w / 2, h)
  }, { repeat: true })
}

// A banknote bundle: green bill with a paler centre panel and paper band.
export function cashTexture() {
  return canvasTexture('cash', 128, 64, (ctx, w, h) => {
    ctx.fillStyle = '#7cc66a'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#b9e6a8'
    ctx.fillRect(8, 8, w - 16, h - 16)
    ctx.fillStyle = '#5fa851'
    ctx.beginPath()
    ctx.arc(w / 2, h / 2, h * 0.22, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#f2f6ee'
    ctx.fillRect(w * 0.42, 0, w * 0.16, h)
  })
}

// Dark leaderboard / notice panel with a title and faint rows of text.
export function boardTexture(title, seed = 1) {
  return canvasTexture(`board-${title}-${seed}`, 512, 320, (ctx, w, h) => {
    const rand = seededRandom(seed)
    ctx.fillStyle = '#2b2522'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#6e4529'
    ctx.lineWidth = 14
    ctx.strokeRect(7, 7, w - 14, h - 14)
    ctx.fillStyle = '#ffd34d'
    ctx.font = `44px ${LABEL_FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(title, w / 2, 52)
    for (let i = 0; i < 6; i++) {
      const y = 104 + i * 34
      ctx.fillStyle = i < 3 ? ['#ffd34d', '#d7dde3', '#d8955a'][i] : '#cfc7bd'
      ctx.fillRect(40, y, 26, 18)
      ctx.fillStyle = 'rgba(240,235,228,0.75)'
      ctx.fillRect(80, y + 3, 120 + rand() * 160, 12)
      ctx.fillRect(w - 110, y + 3, 70, 12)
    }
  })
}

// Small picket sign face: cream board with one dark word.
export function signTexture(text) {
  return canvasTexture(`sign-${text}`, 256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e9d9b8'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#6e4529'
    ctx.lineWidth = 10
    ctx.strokeRect(5, 5, w - 10, h - 10)
    ctx.fillStyle = '#3b2314'
    ctx.font = `52px ${LABEL_FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, w / 2, h / 2 + 4)
  })
}

// Porta-potty door: wood panel with a crescent-moon vent and an orange
// "occupied" tab.
export function pottyDoorTexture() {
  return canvasTexture('potty-door', 128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#c9a774'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(0,0,0,0.08)'
    for (let x = 0; x < w; x += 16) ctx.fillRect(x, 0, 2, h)
    ctx.strokeStyle = '#8a5a35'
    ctx.lineWidth = 8
    ctx.strokeRect(4, 4, w - 8, h - 8)
    ctx.fillStyle = '#f08a1c'
    ctx.beginPath()
    ctx.arc(w / 2, 58, 24, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#c9a774'
    ctx.beginPath()
    ctx.arc(w / 2 + 11, 52, 21, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#3b2314'
    ctx.fillRect(w - 30, h / 2, 12, 26)
  })
}

// Glowing segmented ring under the locked jar: bright blue tick blocks with
// a soft halo, drawn on transparent so it can be blended additively.
export function glowRingTexture() {
  return canvasTexture('glow-ring', 512, 512, (ctx, S) => {
    const c = S / 2
    const halo = ctx.createRadialGradient(c, c, S * 0.28, c, c, S * 0.5)
    halo.addColorStop(0, 'rgba(30,120,255,0)')
    halo.addColorStop(0.45, 'rgba(30,120,255,0.95)')
    halo.addColorStop(1, 'rgba(30,120,255,0)')
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, S, S)
    ctx.lineWidth = S * 0.07
    const n = 10
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + 0.06
      const a1 = ((i + 1) / n) * Math.PI * 2 - 0.06
      ctx.strokeStyle = '#e8f6ff'
      ctx.beginPath()
      ctx.arc(c, c, S * 0.38, a0, a1)
      ctx.stroke()
    }
  })
}

// Equirectangular sky for the dome: saturated cyan zenith over rows of
// flat-shaded cartoon cloud puffs that get paler toward the viewer and run
// a little below the horizon (the island is usually seen from above), then
// flat pale blue underneath. 1 logical px of height is ~0.18 deg.
export function skyTexture() {
  // Painted at 2x in 2048x1024 logical units so the puffs stay crisp.
  return canvasTexture('sky', 4096, 2048, (ctx, w, h) => {
    ctx.scale(2, 2)
    const W = w / 2
    const H = h / 2
    const horizon = H / 2
    const g = ctx.createLinearGradient(0, 0, 0, horizon)
    g.addColorStop(0, '#06c9ec')
    g.addColorStop(0.6, '#14d3ef')
    g.addColorStop(1, '#5fdff0')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)

    const rand = seededRandom(17)
    const rows = [
      { y: -70, r: [22, 44], body: '#4fd3ea', lit: '#86e3f1' },
      { y: -42, r: [20, 40], body: '#79dcec', lit: '#aaebf4' },
      { y: -14, r: [18, 38], body: '#9ce4ef', lit: '#c9f2f8' },
      { y: 14, r: [18, 34], body: '#b4e9f1', lit: '#dff7fa' },
      { y: 42, r: [16, 32], body: '#c2ebf1', lit: '#e8f9fb' },
      { y: 70, r: [16, 30], body: '#c9ecf1', lit: '#eefafc' },
    ]
    const puff = (x, y, r, row) => {
      for (const dx of [-W, 0, W]) {
        const grad = ctx.createRadialGradient(x + dx - r * 0.25, y - r * 0.4, r * 0.1, x + dx, y, r)
        grad.addColorStop(0, row.lit)
        grad.addColorStop(0.55, row.body)
        grad.addColorStop(1, row.body)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(x + dx, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    rows.forEach((row, i) => {
      const base = horizon + row.y
      // Solid body under the puffs so each row reads as one bank.
      const next = i + 1 < rows.length ? horizon + rows[i + 1].y : horizon + 110
      ctx.fillStyle = row.body
      ctx.fillRect(0, base, W, next - base + 40)
      let x = rand() * 80
      while (x < W) {
        const r = row.r[0] + rand() * (row.r[1] - row.r[0])
        puff(x, base - r * 0.35 + (rand() - 0.5) * 10, r, row)
        x += r * (0.8 + rand() * 0.6)
      }
    })
    const low = ctx.createLinearGradient(0, horizon + 110, 0, horizon + 180)
    low.addColorStop(0, '#c9ecf1')
    low.addColorStop(1, '#c9e8ec')
    ctx.fillStyle = low
    ctx.fillRect(0, horizon + 110, W, H)
  })
}

// Overhead NPC tag: yellow caps on a dark rounded pill (a canvas, for a sprite).
export function pillLabelTexture(text) {
  return canvasTexture(`pill-${text}`, 1024, 96, (ctx, w, h) => {
    ctx.font = `56px ${LABEL_FONT}`
    const tw = Math.min(ctx.measureText(text).width + 60, w - 8)
    const x = (w - tw) / 2
    ctx.fillStyle = 'rgba(16,14,12,0.88)'
    ctx.beginPath()
    ctx.roundRect(x, 10, tw, h - 20, (h - 20) / 2)
    ctx.fill()
    ctx.fillStyle = '#ffe14a'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, w / 2, h / 2 + 3)
  })
}

// Floating vendor tag: `fill` caps with a thick black outline and a small
// down-chevron under it, on transparent (for a sprite).
export function outlineTagTexture(text, fill = '#ffffff') {
  return canvasTexture(`tag-${text}-${fill}`, 512, 160, (ctx, w) => {
    ctx.font = `76px ${LABEL_FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 16
    ctx.strokeStyle = '#111111'
    ctx.fillStyle = fill
    ctx.strokeText(text, w / 2, 62)
    ctx.fillText(text, w / 2, 62)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(w / 2 - 14, 116)
    ctx.lineTo(w / 2, 130)
    ctx.lineTo(w / 2 + 14, 116)
    ctx.lineWidth = 14
    ctx.stroke()
    ctx.lineWidth = 5
    ctx.strokeStyle = fill
    ctx.stroke()
  })
}

// Big painted board face: muted brown planks with chunky white words in a
// black outline, one word per line.
export function bigSignTexture(lines, board = '#86685a') {
  return canvasTexture(`bigsign-${lines.join('|')}`, 512, 352, (ctx, w, h) => {
    const rand = seededRandom(lines.join('').length)
    ctx.fillStyle = board
    ctx.fillRect(0, 0, w, h)
    // Faint plank grain.
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = rand() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)'
      ctx.fillRect(rand() * w, rand() * h, 60 + rand() * 160, 2 + rand() * 3)
    }
    let size = Math.min(128, (h - 40) / lines.length / 1.05)
    ctx.font = `${size}px ${LABEL_FONT}`
    // Shrink to fit the widest line inside a margin.
    const widest = Math.max(...lines.map((t) => ctx.measureText(t).width))
    size = Math.min(size, (size * (w - 56)) / widest)
    ctx.font = `${size}px ${LABEL_FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    lines.forEach((text, i) => {
      const y = h / 2 + (i - (lines.length - 1) / 2) * size * 1.05
      ctx.save()
      ctx.translate(w / 2, y)
      ctx.rotate(-0.04)
      ctx.lineWidth = size * 0.2
      ctx.strokeStyle = '#141414'
      ctx.strokeText(text, 0, 0)
      ctx.fillStyle = '#ffffff'
      ctx.fillText(text, 0, 0)
      ctx.restore()
    })
  })
}

// Blocky avatar face: a flat skin square with dot eyes, short brows and a
// small flat mouth.
export function blockFaceTexture(skin) {
  return canvasTexture(`face-${skin}`, 128, 128, (ctx, w) => {
    ctx.fillStyle = skin
    ctx.fillRect(0, 0, w, w)
    ctx.fillStyle = '#1c1c1c'
    for (const x of [44, 84]) {
      ctx.beginPath()
      ctx.ellipse(x, 62, 5, 9, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(x - 9, 44, 18, 4)
    }
    ctx.fillRect(54, 92, 20, 4)
  })
}

// Denim shirt front: two collar flaps, a placket with buttons and a pocket.
export function shirtTexture(color) {
  return canvasTexture(`shirt-${color}`, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = color
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    for (let y = 0; y < h; y += 6) ctx.fillRect(0, y, w, 2)
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(w / 2, 0)
    ctx.lineTo(w / 2, h)
    ctx.stroke()
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath()
    ctx.moveTo(w * 0.3, 0)
    ctx.lineTo(w / 2, h * 0.16)
    ctx.lineTo(w * 0.7, 0)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(w * 0.3, 0)
    ctx.lineTo(w * 0.46, h * 0.2)
    ctx.moveTo(w * 0.7, 0)
    ctx.lineTo(w * 0.54, h * 0.2)
    ctx.stroke()
    ctx.fillStyle = '#d9dde3'
    for (let y = 50; y < h; y += 50) {
      ctx.beginPath()
      ctx.arc(w / 2 + 8, y, 4, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.strokeRect(w * 0.62, h * 0.3, w * 0.2, h * 0.18)
  })
}
