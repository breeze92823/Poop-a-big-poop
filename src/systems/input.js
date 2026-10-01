import { showMenu } from './bloxity.js'

// inputState: WASD/arrow move (camera-relative, consumed by playerMovement),
// a right-drag look delta + wheel zoom (consumed by cameraOrbit), and
// edge-triggered jump / poop flags cleared by whichever system consumes them.
// A poop is a quick left-click or tap on the 3D view (not on HUD buttons).
export const inputState = {
  move: { x: 0, z: 0 }, // x = strafe (+ right), z = forward (+ forward)
  look: { dx: 0, dy: 0 }, // pixels dragged this frame; consumed by cameraOrbit
  zoom: 0, // wheel delta this frame; consumed by cameraOrbit
  jump: false,
  poop: false,
}

const TAP_MAX_MS = 350
const TAP_MAX_PX = 10
let tap = null // { id, x, y, t } of the pointer that might become a tap

const held = new Set()
let orbiting = false
let installed = false

function recomputeMove() {
  let x = 0
  let z = 0
  if (held.has('KeyW') || held.has('ArrowUp')) z += 1
  if (held.has('KeyS') || held.has('ArrowDown')) z -= 1
  if (held.has('KeyD') || held.has('ArrowRight')) x += 1
  if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1
  inputState.move.x = x
  inputState.move.z = z
}

function onKeyDown(e) {
  if (e.repeat) return
  held.add(e.code)
  if (e.code === 'Space') inputState.jump = true
  if (e.code === 'Escape') showMenu() // opens the portal's own pause menu
  recomputeMove()
}

function onKeyUp(e) {
  held.delete(e.code)
  recomputeMove()
}

// Right-drag orbits the camera; a short left-click/tap on the canvas poops.
function onPointerDown(e) {
  if (e.button === 0 && e.target instanceof HTMLCanvasElement) {
    tap = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() }
  }
  if (e.pointerType === 'touch') return
  if (e.button === 2) orbiting = true
}

function onPointerUp(e) {
  if (tap && e.pointerId === tap.id) {
    const quick = performance.now() - tap.t < TAP_MAX_MS
    const still = Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < TAP_MAX_PX
    if (quick && still) inputState.poop = true
    tap = null
  }
  if (e.pointerType === 'touch') return
  if (e.button === 2) orbiting = false
}

function onPointerMove(e) {
  if (!orbiting) return
  inputState.look.dx += e.movementX || 0
  inputState.look.dy += e.movementY || 0
}

function onWheel(e) {
  inputState.zoom += e.deltaY
}

function onContextMenu(e) {
  e.preventDefault() // right-drag is the orbit gesture
}

function onBlur() {
  held.clear()
  orbiting = false
  inputState.jump = false
  tap = null
  recomputeMove()
}

export function install() {
  if (installed) return
  installed = true
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('wheel', onWheel, { passive: true })
  window.addEventListener('contextmenu', onContextMenu)
  window.addEventListener('blur', onBlur)
}

export function uninstall() {
  if (!installed) return
  installed = false
  onBlur()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('contextmenu', onContextMenu)
  window.removeEventListener('blur', onBlur)
}
