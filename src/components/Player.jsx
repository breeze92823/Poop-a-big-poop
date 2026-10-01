import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Quaternion, Vector3 } from 'three'
import { player } from '../systems/playerState.js'
import { authState, getEquippedAvatar, getProportions, onAvatarChanged, onProportionsChanged, subscribeAuth } from '../systems/bloxity.js'
import { DEV_MODE } from '../data/bloxity.js'
import { applyProportions, attachEquippedAccessories } from '../systems/avatarLoader.js'
import { buildDefaultCharacter, loadBaseCharacter } from '../systems/defaultCharacter.js'
import { useGameStore } from '../store/useGameStore.js'
import { makeGait, updateGait, disposeGait } from '../systems/avatarAnim.js'

const _up = new Vector3(0, 1, 0)
const _targetQuat = new Quaternion()
const TURN_RATE = 0.001 // base of 1 - TURN_RATE^delta; smaller = snappier turn

// The player is always the game's own character (systems/defaultCharacter.js)
// — never the raw Bloxity avatar. A signed-in player's equipped Bloxity hat
// and back item are attached to it as accessories. Rebuilds whenever the
// player edits their avatar in the customizer or signs in/out.
function useBloxityAvatar() {
  const [avatar, setAvatar] = useState(() => buildDefaultCharacter())
  const signedIn = !!authState.user
  const currentRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let generation = 0
    const controller = new AbortController()

    async function load() {
      // The SDK fires twice per change (optimistic + confirmed); only the
      // newest load may land, or a slower stale one could overwrite it.
      const mine = ++generation
      const group = await loadBaseCharacter()
      if (cancelled || mine !== generation) return
      const equipped = signedIn && !DEV_MODE ? getEquippedAvatar() : null
      await attachEquippedAccessories(group, equipped, { signal: controller.signal })
      if (cancelled || mine !== generation) return
      currentRef.current = group
      applyProportions(group, getProportions())
      setAvatar(group)
      // Only count it once auth has settled, so the signed-in accessory
      // load (not the pre-auth bare one) is what releases the loading screen.
      if (authState.ready) useGameStore.setState({ avatarLoaded: true })
    }
    load()
    // Signed-out case: no reload follows auth settling, so release here.
    const offAuth = subscribeAuth((s) => {
      if (s.ready && !authState.user && currentRef.current) useGameStore.setState({ avatarLoaded: true })
    })

    const offAvatar = onAvatarChanged(() => load())
    const offProportions = onProportionsChanged(() => {
      if (currentRef.current) applyProportions(currentRef.current, getProportions())
    })

    return () => {
      cancelled = true
      controller.abort()
      offAvatar()
      offProportions()
      offAuth()
    }
  }, [signedIn])

  return avatar
}

// Presentation only: read the player singleton, draw the character. The
// group origin sits at the capsule base (feet), matching playerState's
// convention. No physics engine here — systems/playerMovement.js is what
// actually moves the player each frame; this component just turns toward
// player.facing rather than snapping to it.
export default function Player() {
  const ref = useRef()
  const avatar = useBloxityAvatar()
  const gaitRef = useRef(null)

  // Rebuilt per loaded avatar — the gait's cached bind-pose quaternions
  // (see avatarAnim.js) belong to one specific rig instance.
  useEffect(() => {
    gaitRef.current = null
    if (!avatar) return
    gaitRef.current = makeGait({ root: avatar, nodes: avatar.nodes || {}, clips: avatar.animations || [] })

    return () => {
      disposeGait(gaitRef.current)
      gaitRef.current = null
    }
  }, [avatar])

  useFrame((_state, delta) => {
    const g = ref.current
    if (!g) return
    g.position.set(player.position.x, player.position.y, player.position.z)
    _targetQuat.setFromAxisAngle(_up, player.facing)
    g.quaternion.slerp(_targetQuat, 1 - Math.pow(TURN_RATE, delta))

    const gait = gaitRef.current
    if (gait) {
      const speed01 = Math.hypot(player.velocity.x, player.velocity.z) / player.moveSpeed
      updateGait(gait, Math.min(delta, 0.1), speed01, player.grounded)
    }
  })

  return (
    <group ref={ref}>
      <primitive object={avatar} />
    </group>
  )
}
