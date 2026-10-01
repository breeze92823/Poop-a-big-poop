import { useEffect, useState } from 'react'
import { touchState, subscribeTouchMode } from '../systems/input.js'

// Full-screen "turn your phone" gate. The two-thumb touch layout
// (TouchControls.jsx) needs landscape. Shown only on touch sessions, so a
// narrow desktop window is left alone, and it swallows input while up.
const isPortrait = () => window.innerHeight > window.innerWidth

export default function RotatePrompt() {
  const [touch, setTouch] = useState(touchState.active)
  const [portrait, setPortrait] = useState(isPortrait())

  useEffect(() => subscribeTouchMode(setTouch), [])

  useEffect(() => {
    const sync = () => setPortrait(isPortrait())
    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
    }
  }, [])

  // Best effort: Android Chrome honours this in fullscreen/installed mode;
  // iOS ignores it, so the prompt below stays the fallback.
  useEffect(() => {
    if (!touch) return
    try {
      screen.orientation?.lock?.('landscape')?.catch(() => {})
    } catch {
      /* unsupported */
    }
  }, [touch])

  if (!touch || !portrait) return null

  return (
    <div className="rotate-prompt">
      <svg width="88" height="88" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'rotate-hint 2.2s ease-in-out infinite' }}>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 19h2" />
        <path d="M2 12a10 10 0 0 1 3-7" />
        <path d="M2 5v4h4" />
      </svg>
      <h2>Rotate your device</h2>
      <p>Poop a Big Poop plays in landscape. Turn your phone sideways to keep going.</p>
    </div>
  )
}
