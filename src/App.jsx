import { Suspense, useCallback, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PCFSoftShadowMap, SRGBColorSpace } from 'three'
import { CHEST_ENABLED } from './data/world.js'
import { notifyFirstFrame } from './systems/bloxity.js'
import { settings } from './systems/settingsState.js'
import { useSettings } from './systems/bloxityHooks.js'
import GameLoop from './components/GameLoop.jsx'
import Island from './components/Island.jsx'
import Cliffs from './components/Cliffs.jsx'
import Vegetation from './components/Vegetation.jsx'
import Market from './components/Market.jsx'
import Landmarks from './components/Landmarks.jsx'
import ChainedJar from './components/ChainedJar.jsx'
import TreasureChest from './components/TreasureChest.jsx'
import TreasureFlight from './components/TreasureFlight.jsx'
import UpdateNotice from './components/UpdateNotice.jsx'
import Poops from './components/Poops.jsx'
import GuideArrows from './components/GuideArrows.jsx'
import Sky from './components/Sky.jsx'
import Lighting from './components/Lighting.jsx'
import Player from './components/Player.jsx'
import RemotePlayers from './components/RemotePlayers.jsx'
import Hud from './components/Hud.jsx'
import TouchControls from './components/TouchControls.jsx'
import RotatePrompt from './components/RotatePrompt.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'

// Pale blue below the horizon (matches the bottom of the sky dome); the
// fog only reaches the far side of the island at max zoom.
const HORIZON = '#c9e8ec'

// Rendered last inside the Suspense boundary, so it only mounts once every
// suspending resource in the scene has resolved — the right moment to tell the
// SDK loading is done and gameplay has started.
function LoadingGate({ onReady }) {
  useEffect(() => {
    notifyFirstFrame()
    onReady()
  }, [onReady])
  return null
}

const GRAPHICS_PRESETS = {
  Low: { shadows: false, antialias: false, dpr: [1, 1] },
  Medium: { shadows: true, antialias: false, dpr: [1, 1.5] },
  High: { shadows: true, antialias: true, dpr: [1, 2] },
  Ultra: { shadows: true, antialias: true, dpr: [1, 2] },
}

export default function App() {
  useSettings()
  const [sceneReady, setSceneReady] = useState(false)
  const onSceneReady = useCallback(() => setSceneReady(true), [])
  const preset = GRAPHICS_PRESETS[settings.graphics_quality] ?? GRAPHICS_PRESETS.High

  return (
    <>
      <Canvas
        shadows={preset.shadows && { type: PCFSoftShadowMap }}
        dpr={preset.dpr}
        gl={{ antialias: preset.antialias, powerPreference: 'high-performance', outputColorSpace: SRGBColorSpace }}
        camera={{ fov: 70, near: 0.1, far: 400, position: [0, 12, 24] }}
      >
        <color attach="background" args={[HORIZON]} />
        <fog attach="fog" args={[HORIZON, 120, 320]} />
        <Sky />
        <Lighting />

        <GameLoop />
        <Suspense fallback={null}>
          <Island />
          <Cliffs />
          <Vegetation />
          <Market />
          <Landmarks />
          <ChainedJar />
          {CHEST_ENABLED && <TreasureChest />}
          {CHEST_ENABLED && <TreasureFlight />}
          <Poops />
          <LoadingGate onReady={onSceneReady} />
        </Suspense>
        <GuideArrows />
        <Player />
        <RemotePlayers />
      </Canvas>
      <Hud />
      <UpdateNotice />
      <TouchControls />
      <RotatePrompt />
      <LoadingScreen sceneReady={sceneReady} />
    </>
  )
}
