import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { player } from '../systems/playerState.js'

// Floating name above a remote player: a camera-facing sprite painted from a
// small canvas, anchored at its bottom centre just above the head.
const NAMETAG_Y = player.dims.height + 0.25
const WORLD_HEIGHT = 0.4 // m tall in the world
const REPAINT_INTERVAL_MS = 1000

function paint(name) {
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')
  const font = '600 48px system-ui, sans-serif'
  ctx.font = font
  const w = Math.ceil(ctx.measureText(name).width) + 32
  c.width = w
  c.height = 72
  ctx.font = font // resizing the canvas reset the context
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 8
  ctx.strokeStyle = 'rgba(0,0,0,0.75)'
  ctx.strokeText(name, w / 2, 38)
  ctx.fillStyle = '#ffffff'
  ctx.fillText(name, w / 2, 38)
  const texture = new CanvasTexture(c)
  texture.colorSpace = SRGBColorSpace
  return { texture, aspect: w / 72 }
}

// `getName` is a getter, not a prop, so this never re-renders on a schema
// change — same pull-based reasoning as reading a remote PlayerState in a frame loop.
export default function Nametag({ getName }) {
  const spriteRef = useRef()
  const textureRef = useRef(null)
  const lastName = useRef(null)
  const accumMs = useRef(REPAINT_INTERVAL_MS)

  useEffect(() => () => textureRef.current?.dispose(), [])

  useFrame((_state, delta) => {
    accumMs.current += delta * 1000
    if (accumMs.current < REPAINT_INTERVAL_MS) return
    accumMs.current = 0
    const name = getName() || 'Player'
    if (name === lastName.current) return
    lastName.current = name
    const { texture, aspect } = paint(name)
    const sprite = spriteRef.current
    if (sprite) {
      sprite.material.map = texture
      sprite.material.needsUpdate = true
      sprite.scale.set(WORLD_HEIGHT * aspect, WORLD_HEIGHT, 1)
    }
    textureRef.current?.dispose()
    textureRef.current = texture
  })

  return (
    <sprite ref={spriteRef} position={[0, NAMETAG_Y, 0]} center={[0.5, 0]}>
      <spriteMaterial transparent depthWrite={false} />
    </sprite>
  )
}
