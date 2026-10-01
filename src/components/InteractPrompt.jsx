import { useEffect, useRef } from 'react'
import { interactState } from '../systems/interact.js'
import { interactHoldState } from '../systems/interactHold.js'

// Circumference of the hold ring's r=15 circle — the SVG's stroke-dasharray /
// dashoffset unit. Drawn from full offset (empty) down to 0 (a full ring) as
// the hold approaches HOLD_MS (systems/interactHold.js).
const RING_RADIUS = 15
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

// "Press E to ..." card for the nearest INTERACTS zone: a translucent dark
// card with a square E keycap ringed by the hold-to-confirm progress. While E
// is held the card strips down to just the enlarged keycap + ring; an early
// release snaps everything back. Written imperatively on a ~10Hz poll of the
// systems singletons so it never re-renders per frame.
export default function InteractPrompt() {
  const rootRef = useRef(null)
  const ringRef = useRef(null)
  const textRef = useRef(null)

  useEffect(() => {
    let shown = null
    const id = setInterval(() => {
      const root = rootRef.current
      const ring = ringRef.current
      const text = textRef.current
      if (!root || !ring || !text) return
      const zone = interactState.zone
      if (zone !== shown) {
        shown = zone
        root.style.display = zone ? '' : 'none'
        if (zone) text.textContent = zone.prompt
      }
      const p = zone ? interactHoldState.progress : 0
      ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - p))
      root.classList.toggle('is-held', p > 0)
    }, 100)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={rootRef} className="interact-prompt" style={{ display: 'none' }}>
      <span className="interact-key">
        <svg viewBox="0 0 36 36" aria-hidden>
          <circle cx="18" cy="18" r={RING_RADIUS} className="interact-ring-bg" />
          <circle
            ref={ringRef}
            cx="18"
            cy="18"
            r={RING_RADIUS}
            className="interact-ring"
            style={{ strokeDasharray: RING_CIRCUMFERENCE, strokeDashoffset: RING_CIRCUMFERENCE }}
          />
        </svg>
        <b>E</b>
      </span>
      <span ref={textRef} className="interact-label" />
    </div>
  )
}
