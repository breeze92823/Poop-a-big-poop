import { useEffect, useRef } from 'react'
import { actionResultState } from '../systems/actionResult.js'

// Top-centre popup surfacing the result of a held-E interaction
// (systems/interact.js) — green on success, red on a blocked attempt. Polled
// from systems/actionResult.js's singleton at ~10Hz, comparing its `id` so a
// repeat of the same message still re-triggers the one-shot pop animation.
export default function ActionResult() {
  const rootRef = useRef(null)
  const barRef = useRef(null)
  const textRef = useRef(null)

  useEffect(() => {
    let lastId = actionResultState.id
    const id = setInterval(() => {
      if (actionResultState.id === lastId) return
      lastId = actionResultState.id
      const root = rootRef.current
      const bar = barRef.current
      const label = textRef.current
      if (!root || !bar || !label) return
      label.textContent = actionResultState.text
      label.style.color = actionResultState.success ? '#4ade80' : '#f87171'
      root.style.display = ''
      // Restart the animation even if it is mid-run for a previous message.
      bar.style.animation = 'none'
      void bar.offsetHeight
      bar.style.animation = ''
    }, 100)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={rootRef} className="action-result" style={{ display: 'none' }}>
      <div
        ref={barRef}
        className="action-result-bar"
        onAnimationEnd={() => {
          if (rootRef.current) rootRef.current.style.display = 'none'
        }}
      >
        <span ref={textRef} />
      </div>
    </div>
  )
}
