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
import { nearestStealTarget, requestSteal } from './net.js'
import { buyTheftImmunity, hasTheftImmunity } from './theftImmunity.js'
import { STEAL_COST } from '../data/net.js'

// The zone the player is standing in (nearest wins), or null. Read by
// InteractPrompt / TouchControls at ~10Hz.
export const interactState = { zone: null }

// The jar's prompt flips once it's owned; a separate cached zone keeps identity stable.
const JAR_OWNED = { id: 'jar', key: 'jar-owned', prompt: 'Theft Immunity Active' }

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
  if (best && best.id === 'jar' && hasTheftImmunity()) return JAR_OWNED
  return best
}

// A remote player close enough to rob becomes a zone of its own. Cached per player so the
// zone keeps its identity between frames (InteractPrompt and the hold timer compare it).
const stealZones = new Map()

function stealZone() {
  if (hasTheftImmunity()) return null // protected players can't steal either
  const t = nearestStealTarget(player.position.x, player.position.z)
  if (!t) return null
  const secs = Math.ceil(t.blockedMs / 1000)
  const prompt = secs
    ? `Can't steal back from ${t.name} · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
    : `Steal ${t.name}'s Poop · $${STEAL_COST.toLocaleString()}`
  let zone = stealZones.get(t.id)
  if (!zone || zone.prompt !== prompt) {
    zone = { id: secs ? 'stealBlocked' : 'steal', key: `steal:${t.id}:${secs ? 'blocked' : 'ok'}`, targetId: t.id, prompt }
    stealZones.set(t.id, zone)
  }
  return zone
}

const ACTIONS = {
  stealBlocked() {
    showActionResult("Can't steal back yet", false)
  },
  steal(zone) {
    requestSteal(zone.targetId)
  },
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
    buyTheftImmunity()
  },
}

export function step() {
  const zone = isShopOpen() || getSellOpen() || isBoostOpen() || isFoodFxOpen() ? null : nearestZone() || stealZone()
  interactState.zone = zone
  if (!stepHold(zone ? zone.key || zone.id : null, isInteractKeyDown())) return
  const act = ACTIONS[zone.id]
  if (act) {
    act(zone)
    // Panel-opening actions are silent otherwise; the jar plays its own fail buzz and a
    // steal reports its own result.
    if (zone.id !== 'jar' && zone.id !== 'steal' && zone.id !== 'stealBlocked') playPop()
  } else showActionResult('Coming soon', false)
}
