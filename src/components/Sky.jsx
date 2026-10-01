import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BackSide } from 'three'
import { skyTexture } from '../utils/textures.js'

// Cartoon skybox: an unlit dome painted with a cyan gradient and a band of
// puffy clouds (utils/textures.js skyTexture). Follows the camera so the
// clouds sit at infinity; ignores fog and tone mapping so the colours stay
// as painted.
const DOME_RADIUS = 300

export default function Sky() {
  const camera = useThree((s) => s.camera)
  const group = useRef()
  const map = useMemo(() => skyTexture(), [])

  useFrame(() => {
    if (group.current) group.current.position.copy(camera.position)
  })

  return (
    <group ref={group} renderOrder={-2}>
      <mesh frustumCulled={false}>
        <sphereGeometry args={[DOME_RADIUS, 48, 24]} />
        <meshBasicMaterial map={map} side={BackSide} depthWrite={false} fog={false} toneMapped={false} />
      </mesh>
    </group>
  )
}
