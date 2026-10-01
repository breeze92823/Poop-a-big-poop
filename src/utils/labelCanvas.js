import { CanvasTexture, SRGBColorSpace } from 'three'

export const LABEL_FONT = '"Lilita One", "Arial Black", sans-serif'

// Shared canvas -> texture helper for painted signs and nametags. `lines` is
// [{ text, size (m), fill }]; returns { texture, width, height } in metres.
export function makeLabelTexture(lines) {
  const PX = 160 // canvas pixels per metre
  const pad = 0.12
  const measure = document.createElement('canvas').getContext('2d')
  let w = 0
  let h = pad
  for (const l of lines) {
    measure.font = `${l.size * PX}px ${LABEL_FONT}`
    w = Math.max(w, measure.measureText(l.text).width / PX)
    h += l.size * 1.15
  }
  w += pad * 2
  h += pad
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(w * PX)
  canvas.height = Math.ceil(h * PX)
  const ctx = canvas.getContext('2d')
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  let y = pad
  for (const l of lines) {
    const lh = l.size * 1.15
    ctx.font = `${l.size * PX}px ${LABEL_FONT}`
    ctx.lineWidth = l.size * PX * 0.22
    ctx.strokeStyle = '#3b2314'
    ctx.strokeText(l.text, canvas.width / 2, (y + lh / 2) * PX)
    ctx.fillStyle = l.fill
    ctx.fillText(l.text, canvas.width / 2, (y + lh / 2) * PX)
    y += lh
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return { texture, width: w, height: h }
}
