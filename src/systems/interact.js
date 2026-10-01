// Orchestrates every "Press E to ..." action behind the shared 2-second hold
// gate (systems/interactHold.js): proximity picks the nearest INTERACTS zone,
// holding E fills the ring InteractPrompt draws, and only a completed hold
// fires the zone's action — an early release visibly cancels it. Stepped once
// per frame from GameLoop.jsx.
import { INTERACTS } from '../data/world.js'
import { player } from './playerState.js'
import { isInteractKeyDown } from './input.js'
import { step as stepHold } from './interactHold.js'
import { showActionResult } from './actionResult.js'
import { playPop } from './sfx.js'
import { getSellOpen, openSell } from './sellPanel.js'
import { isShopOpen, openShop } from './shop.js'
import { isBoostOpen, openBoost } from './boost.js'
import { isFoodFxOpen, openFoodFx } from './foodFx.js'

// The zone the player is standing in (nearest wins), or null. Read by
// InteractPrompt / TouchControls at ~10Hz.
export const interactState = { zone: null }

function nearestZone() {
  const { x, z } = player.position
  let best = null
  let bestD = Infinity
  for (const zone of INTERACTS) {
    const d = Math.hypot(zone.x - x, zone.z - z)
    if (d <= zone.r && d < bestD) {
      best = zone
      bestD = d
    }
  }
  return best
}

const ACTIONS = {
  buy() {
    openShop()
  },
  sell() {
    openSell()
  },
  boost() {
    openBoost()
  },
  foodFx() {
    openFoodFx()
  },
  jar() {
    showActionResult('Locked', false)
  },
}

export function step() {
  const zone = isShopOpen() || getSellOpen() || isBoostOpen() || isFoodFxOpen() ? null : nearestZone()
  interactState.zone = zone
  if (!stepHold(zone ? zone.id : null, isInteractKeyDown())) return
  const act = ACTIONS[zone.id]
  if (act) {
    act()
    // Panel-opening actions are silent otherwise; the jar plays its own fail buzz.
    if (zone.id !== 'jar') playPop()
  } else showActionResult('Coming soon', false)
}
