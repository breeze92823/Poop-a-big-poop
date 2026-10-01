import { useFrame, useThree } from '@react-three/fiber'
import { step as stepPlayer } from '../systems/playerMovement.js'
import { update as updateCamera } from '../systems/cameraOrbit.js'
import { dropPoop, step as stepPoops } from '../systems/poop.js'
import { inputState } from '../systems/input.js'

// The single simulation tick. Rendered before the view components so its
// useFrame subscribes first and runs first each frame.
export default function GameLoop() {
  const camera = useThree((s) => s.camera)
  if (import.meta.env.DEV) {
    window.__scene = useThree((s) => s.scene)
  }

  useFrame((_state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1) // clamp huge frames (tab switch, breakpoint)
    stepPlayer(dt)
    if (inputState.poop) {
      inputState.poop = false
      dropPoop()
    }
    stepPoops(dt)
    updateCamera(camera, dt)
  })

  return null
}
