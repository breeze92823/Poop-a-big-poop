import { useEffect, useReducer, useRef, useState } from 'react'
import {
  touchState,
  subscribeTouchMode,
  setTouchMove,
  addTouchLook,
  addTouchZoom,
  pressTouchJump,
  pressTouchPoop,
} from '../systems/input.js'

// On-screen controls for a touch session. DOM siblings of the canvas, like the
// rest of the HUD: gestures write straight into the input singleton through
// the setters in systems/input.js, so nothing re-renders per frame.
//
//   left  ~45% / lower ~58%  → floating movement stick
//   right ~54%               → drag orbits the camera, pinch zooms,
//                               a quick tap poops (the game's core action)
//   bottom-right cluster     → POOP and JUMP buttons

const STICK_RADIUS = 54 // px of thumb travel that maps to full speed
const DEAD_ZONE = 0.16
const LOOK_SENS = 0.75 // touch drag px → mouse-drag-equivalent px for cameraOrbit
const PINCH_ZOOM = 2.5 // pinch distance px → wheel-equivalent zoom units
const TAP_MAX_MS = 350
const TAP_MAX_PX = 12

function LookZone() {
  const pointers = useRef(new Map())
  const lastPinch = useRef(0)
  // The single finger still eligible to resolve as a tap on release.
  const tapCandidate = useRef(null)

  const dist = () => {
    const [a, b] = [...pointers.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  const onDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    tapCandidate.current =
      pointers.current.size === 1
        ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: false }
        : null // a second finger makes this a pinch, not a tap
    if (pointers.current.size === 2) lastPinch.current = dist()
  }

  const onMove = (e) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const next = { x: e.clientX, y: e.clientY }
    pointers.current.set(e.pointerId, next)

    if (pointers.current.size >= 2) {
      const d = dist()
      if (lastPinch.current) addTouchZoom((lastPinch.current - d) * PINCH_ZOOM)
      lastPinch.current = d
      tapCandidate.current = null
      return
    }
    addTouchLook((next.x - prev.x) * LOOK_SENS, (next.y - prev.y) * LOOK_SENS)

    const tap = tapCandidate.current
    if (tap && tap.id === e.pointerId && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > TAP_MAX_PX) {
      tap.moved = true
    }
  }

  const onUp = (e) => {
    pointers.current.delete(e.pointerId)
    lastPinch.current = 0
    const tap = tapCandidate.current
    if (tap && tap.id === e.pointerId && !tap.moved && performance.now() - tap.t < TAP_MAX_MS) {
      pressTouchPoop()
    }
    tapCandidate.current = null
  }

  return (
    <div
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={(e) => {
        tapCandidate.current = null // a cancelled gesture is never a tap
        onUp(e)
      }}
      onContextMenu={(e) => e.preventDefault()}
      className="touch-look"
    />
  )
}

// Floating stick: the base springs to wherever the thumb lands in the lower-left
// wedge, so it never has to be found by feel.
function MoveStick() {
  const [, force] = useReducer((n) => n + 1, 0)
  const stick = useRef(null) // { id, ox, oy, tx, ty } in viewport px, or null

  const publish = () => {
    const s = stick.current
    if (!s) return setTouchMove(0, 0)
    let x = (s.tx - s.ox) / STICK_RADIUS
    let y = (s.ty - s.oy) / STICK_RADIUS
    let mag = Math.hypot(x, y)
    if (mag > 1) {
      x /= mag
      y /= mag
      mag = 1
    }
    if (mag < DEAD_ZONE) return setTouchMove(0, 0)
    // Rescale past the dead zone so control is smooth from the edge of it.
    const k = (mag - DEAD_ZONE) / (1 - DEAD_ZONE) / mag
    setTouchMove(x * k, -y * k) // screen up (−y) is forward (+z)
  }

  const onDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    stick.current = { id: e.pointerId, ox: e.clientX, oy: e.clientY, tx: e.clientX, ty: e.clientY }
    force()
  }

  const onMove = (e) => {
    const s = stick.current
    if (!s || s.id !== e.pointerId) return
    s.tx = e.clientX
    s.ty = e.clientY
    publish()
    force()
  }

  const onUp = (e) => {
    if (stick.current && stick.current.id !== e.pointerId) return
    stick.current = null
    setTouchMove(0, 0)
    force()
  }

  const s = stick.current
  let knobX = 0
  let knobY = 0
  if (s) {
    knobX = s.tx - s.ox
    knobY = s.ty - s.oy
    const mag = Math.hypot(knobX, knobY)
    if (mag > STICK_RADIUS) {
      knobX = (knobX / mag) * STICK_RADIUS
      knobY = (knobY / mag) * STICK_RADIUS
    }
  }

  return (
    <div
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onContextMenu={(e) => e.preventDefault()}
      className="touch-stick-zone"
    >
      {s && (
        <>
          <div
            className="touch-stick-base"
            style={{ left: s.ox - STICK_RADIUS, top: s.oy - STICK_RADIUS, width: STICK_RADIUS * 2, height: STICK_RADIUS * 2 }}
          />
          <div className="touch-stick-knob" style={{ left: s.ox - 26 + knobX, top: s.oy - 26 + knobY }} />
        </>
      )}
    </div>
  )
}

function ActionButton({ onPress, label, className }) {
  const [down, setDown] = useState(false)
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        setDown(true)
        onPress()
      }}
      onPointerUp={() => setDown(false)}
      onPointerCancel={() => setDown(false)}
      onContextMenu={(e) => e.preventDefault()}
      className={`touch-btn ${className}${down ? ' is-down' : ''}`}
    >
      {label}
    </button>
  )
}

export default function TouchControls() {
  const [on, setOn] = useState(touchState.active)
  useEffect(() => subscribeTouchMode(setOn), [])

  // Backgrounding the tab mid-gesture must not leave the avatar walking.
  useEffect(() => {
    if (!on) return
    const stop = () => setTouchMove(0, 0)
    window.addEventListener('blur', stop)
    document.addEventListener('visibilitychange', stop)
    return () => {
      window.removeEventListener('blur', stop)
      document.removeEventListener('visibilitychange', stop)
    }
  }, [on])

  if (!on) return null

  return (
    <div className="touch-controls">
      <LookZone />
      <MoveStick />
      <div className="touch-cluster">
        <ActionButton onPress={pressTouchJump} label="JUMP" className="touch-btn-small" />
        <ActionButton onPress={pressTouchPoop} label="💩" className="touch-btn-big" />
      </div>
    </div>
  )
}
