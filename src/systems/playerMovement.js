import { inputState } from './input.js'
import { player } from './playerState.js'
import { getYaw } from './cameraOrbit.js'
import { terrainHeightAt } from './terrainHeight.js'
import { ISLAND, OBSTACLES, PLAYER_MOVE_SPEED } from '../data/world.js'

// Kinematic capsule, stepped once per frame: apply input -> gravity ->
// integrate -> push out of solid props -> keep on the island -> clamp to the
// ground height under the player's feet.
const ACCEL = 45 // m/s^2 approach toward target velocity
const GRAVITY = -22 // m/s^2
const JUMP_SPEED = 7.5 // m/s
const MAX_STEP = 0.65 // m the player can step up without jumping

// Clamps the (dx, dz) delta as one 2D vector so velocity curves straight
// toward the target instead of warping axis-by-axis.
function approach2D(v, targetX, targetZ, maxDelta) {
  const dx = targetX - v.x
  const dz = targetZ - v.z
  const dist = Math.hypot(dx, dz)
  if (dist <= maxDelta || dist === 0) {
    v.x = targetX
    v.z = targetZ
  } else {
    const scale = maxDelta / dist
    v.x += dx * scale
    v.z += dz * scale
  }
}

export function step(dt) {
  if (dt <= 0) return

  // Camera-relative ground basis.
  const yaw = getYaw()
  const fwdX = -Math.sin(yaw)
  const fwdZ = -Math.cos(yaw)
  const rightX = Math.cos(yaw)
  const rightZ = -Math.sin(yaw)

  const mv = inputState.move
  const len = Math.hypot(mv.x, mv.z) || 1
  const wishX = (fwdX * mv.z + rightX * mv.x) / len
  const wishZ = (fwdZ * mv.z + rightZ * mv.x) / len

  approach2D(player.velocity, wishX * PLAYER_MOVE_SPEED, wishZ * PLAYER_MOVE_SPEED, ACCEL * dt)

  // Jump reads last frame's grounded flag, then we clear it for this frame.
  if (inputState.jump) {
    if (player.grounded) player.velocity.y = JUMP_SPEED
    inputState.jump = false
  }
  player.grounded = false

  const p = player.position
  player.velocity.y += GRAVITY * dt
  const prevX = p.x
  const prevZ = p.z
  p.x += player.velocity.x * dt
  p.y += player.velocity.y * dt
  p.z += player.velocity.z * dt

  const r = player.dims.radius
  for (const [ox, oz, or] of OBSTACLES) {
    const dx = p.x - ox
    const dz = p.z - oz
    const d = Math.hypot(dx, dz)
    const min = or + r
    if (d < min && d > 1e-6) {
      p.x = ox + (dx / d) * min
      p.z = oz + (dz / d) * min
    }
  }

  // Invisible wall just inside the rim (inscribed circle of the 20-gon).
  const maxR = ISLAND.radius * Math.cos(Math.PI / ISLAND.sides) - ISLAND.rimInset - r
  const fromCentre = Math.hypot(p.x, p.z)
  if (fromCentre > maxR) {
    p.x *= maxR / fromCentre
    p.z *= maxR / fromCentre
  }

  // Too tall a ledge to step onto: stay put unless the player jumps high enough.
  if (terrainHeightAt(p.x, p.z) > p.y + MAX_STEP) {
    p.x = prevX
    p.z = prevZ
  }

  const groundY = terrainHeightAt(p.x, p.z)
  if (p.y <= groundY) {
    p.y = groundY
    if (player.velocity.y < 0) player.velocity.y = 0
    player.grounded = true
  }

  // Face the direction of travel.
  if (Math.hypot(wishX, wishZ) > 0.01 && (mv.x !== 0 || mv.z !== 0)) {
    player.facing = Math.atan2(wishX, wishZ)
  }
}
