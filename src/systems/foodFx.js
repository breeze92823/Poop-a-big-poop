// Save Food Effects state: open/closed flag and the saved pantry. Pays SAVE_COST to keep the
// foods currently held (and so their effects) for 24 hours; on the next load an unexpired save
// is merged back into the pantry. Re-saving replaces the save and resets the timer. Framework-free;
// components/SaveFoodFx.jsx subscribes through useSyncExternalStore (getFoodFx returns a fresh
// snapshot only when something changed). The save lives in localStorage (never throws).
import { spendMoney } from './poop.js'
import { getPantry, restoreFoods } from './pantry.js'
import { showActionResult } from './actionResult.js'

export const SAVE_COST = 200
export const SAVE_HOURS = 24
export const SAVE_MS = SAVE_HOURS * 3600 * 1000

const KEY = 'poop_saved_foods'

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    if (Array.isArray(s.slots) && Number.isFinite(s.expiresAt) && s.expiresAt > Date.now()) return s
  } catch {
    /* no saved foods, or storage unavailable */
  }
  return { slots: [], expiresAt: 0 }
}

let data = load() // { slots: [{ id, count }], expiresAt }
restoreFoods(data.slots)

let open = false
let timer = null
let snapshot = null
const listeners = new Set()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* storage blocked */
  }
}

function emit() {
  snapshot = null
  for (const fn of listeners) fn()
}

export function subscribeFoodFx(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// open, saved foods + seconds until they expire, and the held foods not yet covered by the save.
export function getFoodFx() {
  if (!snapshot) {
    const now = Date.now()
    const left = Math.max(0, data.expiresAt - now)
    const saved = left > 0 ? data.slots : []
    const held = getPantry().slots
    snapshot = {
      open,
      saved,
      secondsLeft: Math.ceil(left / 1000),
      pending: held.filter((s) => saved.find((v) => v.id === s.id)?.count !== s.count),
      canSave: held.length > 0,
    }
  }
  return snapshot
}

export function isFoodFxOpen() {
  return open
}

export function openFoodFx() {
  if (open) return
  open = true
  timer = setInterval(emit, 1000)
  emit()
}

export function closeFoodFx() {
  if (!open) return
  open = false
  clearInterval(timer)
  timer = null
  emit()
}

export function saveFoods() {
  const slots = getPantry().slots
  if (!slots.length) return showActionResult('No foods to save', false)
  if (!spendMoney(SAVE_COST)) return showActionResult('Not enough money', false)
  data = { slots: slots.map((s) => ({ ...s })), expiresAt: Date.now() + SAVE_MS }
  persist()
  showActionResult('Food effects saved', true)
  emit()
}
