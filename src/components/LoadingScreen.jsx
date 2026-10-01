import { useEffect, useState } from 'react'
import { subscribeAuth } from '../systems/bloxity.js'
import { DEV_MODE } from '../data/bloxity.js'
import { useGameStore } from '../store/useGameStore.js'

// Full-screen DOM overlay, a sibling of <Canvas> in App.jsx. Stays opaque
// until the 3D scene has resolved AND Bloxity auth has settled AND the
// character has loaded, then fades out. VITE_DEV_MODE=true skips it.
const FADE_MS = 450

export default function LoadingScreen({ sceneReady }) {
  const [authReady, setAuthReady] = useState(false)
  const [hidden, setHidden] = useState(false)
  const avatarLoaded = useGameStore((s) => s.avatarLoaded)

  useEffect(() => subscribeAuth((s) => setAuthReady(s.ready)), [])

  const ready = sceneReady && authReady && avatarLoaded

  useEffect(() => {
    if (!ready) return
    const id = setTimeout(() => setHidden(true), FADE_MS)
    return () => clearTimeout(id)
  }, [ready])

  if (DEV_MODE || hidden) return null

  return (
    <div className={`loading${ready ? ' is-done' : ''}`} style={{ transitionDuration: `${FADE_MS}ms` }}>
      <div className="loading-swirl" aria-hidden>
        <i /><i /><i />
      </div>
      <h1>POOP A BIG POOP</h1>
      <div className="loading-track"><div className="loading-fill" /></div>
      <p>{sceneReady ? (authReady ? 'Warming the seat…' : 'Signing in…') : 'Building the park…'}</p>
    </div>
  )
}
