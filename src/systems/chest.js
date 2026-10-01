// Treasure Chest: hold E beside it (interact.js `chest`). The first player opens it for
// everyone (the server's `chestAnim` plays the opening on every client) and it stays open; every
// other player then redeems with E. Only CHEST_MAX_OPENS players ever get the prize, once each:
// CHEST_MONEY plus a Glazed Donut. The server (../Poop-a-big-poop-backend, `openChest`) decides
// who made the cut and remembers it per account; offline, the chest opens once per session.
// Framework-free; components/TreasureChest.jsx subscribes to play the animation and read the label.
import { refundMoney } from './poop.js'
import { addFood } from './pantry.js'
import { player } from './playerState.js'
import { showActionResult } from './actionResult.js'

export const CHEST_MAX_OPENS = 5 // keep == backend CHEST_MAX_OPENS
export const CHEST_MONEY = 2000
export const CHEST_FOOD = 'donut' // Glazed Donut (systems/shop.js FOODS)

// What the room last told us: how many opens remain and whether we already took ours.
const state = { left: CHEST_MAX_OPENS, mine: false, open: false }
const stateListeners = new Set()
const openListeners = new Set()
const claimListeners = new Set()
let lastAnimAt = 0
let sendOpen = null // set by net.js while connected: () => boolean
let waiting = false

export function getChestState() {
  return state
}

export function subscribeChestState(fn) {
  stateListeners.add(fn)
  return () => stateListeners.delete(fn)
}

export function subscribeChestOpen(fn) {
  openListeners.add(fn)
  return () => openListeners.delete(fn)
}

export function setChestSender(fn) {
  sendOpen = fn
}

// net.js: the room's `chest` push (also carried by `chestResult`).
export function applyChestState(d) {
  if (typeof d?.left === 'number') state.left = Math.max(0, Math.min(CHEST_MAX_OPENS, Math.floor(d.left)))
  if (typeof d?.mine === 'boolean') state.mine = d.mine
  if (typeof d?.open === 'boolean') state.open = d.open
  for (const fn of stateListeners) fn(state)
}

// What the label badge and the interact prompt show.
export function chestBadge() {
  if (state.mine) return { text: 'OPENED', tone: 'done' }
  if (state.left <= 0) return { text: 'EMPTY', tone: 'done' }
  return { text: `${state.open ? 'CLAIM!' : 'FREE!'} ${state.left} LEFT`, tone: 'free' }
}

export function subscribeChestClaim(fn) {
  claimListeners.add(fn)
  return () => claimListeners.delete(fn)
}

// net.js `chestClaim`: a player took their prize, so the treasure flies from the chest to them on
// every client. `getPos` returns that player's live { x, y, z } (null once they're gone). The
// opener's claim follows the opening animation closely, so its treasure waits for the lid.
export function onChestClaim(getPos) {
  const delay = performance.now() - lastAnimAt < 1500 ? 0.6 : 0.1
  for (const fn of claimListeners) fn(getPos, delay)
}

// net.js `chestAnim`: someone opened the chest, so it plays the opening for us too and stays open.
export function onChestAnim() {
  lastAnimAt = performance.now()
  state.open = true
  for (const fn of stateListeners) fn(state)
  for (const fn of openListeners) fn()
}

function grantPrize(first) {
  refundMoney(CHEST_MONEY)
  addFood(CHEST_FOOD)
  showActionResult(`${first ? 'Chest opened!' : 'Prize claimed!'} +$${CHEST_MONEY.toLocaleString()} + Glazed Donut`, true)
}

const FAIL_TEXT = {
  mine: 'You already opened the chest',
  empty: 'The chest is empty',
  error: 'Chest failed, try again',
}

// net.js: the room's answer to our `openChest`.
export function onChestResult(d) {
  waiting = false
  applyChestState(d)
  if (d?.ok) grantPrize(d.first === true)
  else showActionResult(FAIL_TEXT[d?.reason] || FAIL_TEXT.error, false)
}

// The room dropped us mid-request.
export function chestOffline() {
  waiting = false
  sendOpen = null
}

// Hold-E action at the chest: opens it, or redeems the prize once it's already open.
export function openChest() {
  if (waiting) return
  if (state.mine) return showActionResult(FAIL_TEXT.mine, false)
  if (state.left <= 0) return showActionResult(FAIL_TEXT.empty, false)
  if (sendOpen && sendOpen()) {
    waiting = true
    return
  }
  // No server: solo session, one opening.
  const first = !state.open
  applyChestState({ left: state.left - 1, mine: true })
  grantPrize(first)
  if (first) onChestAnim()
  onChestClaim(() => player.position)
}
