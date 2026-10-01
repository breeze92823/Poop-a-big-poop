import { ISLAND } from '../data/world.js'

// Sun offset from the island centre. The whole island fits in one shadow
// frustum, so the rig is fixed rather than following the player.
const SUN = [32, 55, 24]
const SHADOW_EXTENT = ISLAND.radius + 8

// Bright, flat-ish daylight like a Roblox lobby: strong sky/ground bounce so
// colours stay saturated, and one shadow-casting sun.
export default function Lighting() {
  return (
    <>
      <hemisphereLight args={['#e6f7ff', '#6f7f4a', 1.1]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={SUN}
        color="#fffaf0"
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-SHADOW_EXTENT}
        shadow-camera-right={SHADOW_EXTENT}
        shadow-camera-top={SHADOW_EXTENT}
        shadow-camera-bottom={-SHADOW_EXTENT}
        shadow-camera-near={1}
        shadow-camera-far={180}
        shadow-bias={-0.0004}
        shadow-normalBias={0.05}
      />
    </>
  )
}
