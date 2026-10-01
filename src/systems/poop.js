import { PALETTE } from '../materials/tile.js'
import { getBoostMult } from './boost.js'
import { playFart } from './sfx.js'
import { getFoodCount } from './pantry.js'

// Meter-to-poop: a finished meter round drops a poop behind the player and stores its
// yield in the inventory (selling it for money comes later). Plain module state, mutated
// in place; the frame loop reads `poops` directly and the HUD subscribes to the totals.
export const POOP_LIFE = 8 // s a poop stays on the grass

export const MAX_POOPS = 6 // most poops the inventory can hold

export const poops = [] // { x, y, z, yaw, size, color, age }

// Starting balances, overridable from .env.local (see .env.example). Invalid or
// negative values fall back to 0.
function envNumber(raw) {
  const n = Number(raw)
  return raw !== undefined && raw !== '' && Number.isFinite(n) && n >= 0 ? n : 0
}

let money = envNumber(import.meta.env.VITE_START_MONEY)
const listeners = new Set()
let inventory = envNumber(import.meta.env.VITE_START_POOP) // poop yield held, not yet sold
const invListeners = new Set()

export function getMoney() {
  return money
}

export function subscribeMoney(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Size follows weight: volume ~ weight, so scale ~ cube root. 100 lb is the baseline (1x).
export const poopScale = (lb) => Math.min(2.5, Math.max(0.4, Math.cbrt(lb / 100)))

const PLAIN = { key: 'plain', name: 'Poop', color: PALETTE.poop }
let nextId = 1
// Lifetime counters (leaderboards via systems/net.js); they only ever grow.
let totalPoops = 0
let totalEarned = 0
// One entry per poop, never merged: { key (unique), type (food id or 'plain'), name, color, value (lb) }
let stacks = inventory > 0 ? [{ ...PLAIN, key: `p${nextId++}`, type: PLAIN.key, value: inventory }] : []
let selectedStack = null
let invSnapshot = { stacks, selected: selectedStack }

function emitInventory() {
  invSnapshot = { stacks, selected: selectedStack }
  for (const fn of invListeners) fn(inventory)
}

// Total poop yield held (what the HUD counter shows).
// Fired with the poop's food type on every drop (systems/net.js relays it to the room).
const dropListeners = new Set()

export function subscribePoopDrop(fn) {
  dropListeners.add(fn)
  return () => dropListeners.delete(fn)
}

export function getInventory() {
  return inventory
}

// Foods and poops share the one cap: MAX_POOPS items in total.
export function getHeldCount() {
  return getFoodCount() + stacks.length
}

export function isInventoryFull() {
  return getHeldCount() >= MAX_POOPS
}

export function subscribeInventory(fn) {
  invListeners.add(fn)
  return () => invListeners.delete(fn)
}

// Stable snapshot of the inventory cards; replaced only when something changes.
export function getPoopStacks() {
  return invSnapshot
}

// Food type of the poop currently selected in the hotbar ('plain' or a food id), or null.
export function getSelectedPoopType() {
  return stacks.find((s) => s.key === selectedStack)?.type ?? null
}

export function toggleStack(key) {
  selectedStack = selectedStack === key ? null : key
  emitInventory()
}

// Finished meter round: drops a poop and stores `amount` yield in the inventory. With a
// `food` (selected in the hotbar) the poop is "<Effect> Poop", takes the food's colour,
// and a VALUE food multiplies the yield while a SIZE food makes the poop bigger.
export function awardPoop(amount, food = null) {
  if (isInventoryFull()) return false
  const kind = food ? { type: food.id, name: `${food.effect} Poop`, color: food.color } : { ...PLAIN, type: PLAIN.key }
  const value = (food && food.stat === 'VALUE' ? amount * food.mult : amount) * getBoostMult()
  stacks = [...stacks, { ...kind, key: `p${nextId++}`, value }]
  inventory += value
  totalPoops += 1
  playFart()
  for (const fn of dropListeners) fn(kind.type)
  emitInventory()
  return true
}

let lastSale = 0 // cash from the most recent sale

// What the player earned on their last sale (0 before the first one).
export function getLastSale() {
  return lastSale
}

export const SELL_RATE = 0.01 // $ per unit of stored poop yield

// Sells the selected poop stack at the Sell Stall (the whole inventory when `all` is set
// or none is selected); returns the cash earned (0 when empty).
export function sellInventory(all = false) {
  const sold = selectedStack && !all ? stacks.filter((s) => s.key === selectedStack) : stacks
  const units = sold.reduce((n, s) => n + s.value, 0)
  if (units <= 0) return 0
  const earned = units * SELL_RATE
  stacks = stacks.filter((s) => !sold.includes(s))
  selectedStack = null
  inventory = stacks.reduce((n, s) => n + s.value, 0)
  money += earned
  totalEarned += earned
  lastSale = earned
  emitInventory()
  for (const fn of listeners) fn(money)
  return earned
}

// Deducts `cost` if affordable; returns whether the purchase went through.
export function spendMoney(cost) {
  if (money < cost) return false
  money -= cost
  for (const fn of listeners) fn(money)
  return true
}

// Gives money back (a failed steal's cost).
export function refundMoney(amount) {
  if (!(amount > 0)) return
  money += amount
  for (const fn of listeners) fn(money)
}

// Another player robbed us: hands over every held poop as { type, value } and empties the inventory.
export function takeAllPoops() {
  const taken = stacks.map((s) => ({ type: s.type, value: s.value }))
  stacks = []
  selectedStack = null
  inventory = 0
  emitInventory()
  return taken
}

// Adds stolen { type, value } poops to the inventory (not counted as drops). `foods` is shop.js's FOODS.
export function addPoops(list, foods) {
  const added = list.slice(0, Math.max(0, MAX_POOPS - getHeldCount())).flatMap((s) => {
    const food = foods.find((f) => f.id === s.type)
    if (!food && s.type !== PLAIN.key) return []
    if (!(typeof s.value === 'number' && s.value > 0)) return []
    const kind = food ? { type: food.id, name: `${food.effect} Poop`, color: food.color } : { ...PLAIN, type: PLAIN.key }
    return [{ ...kind, key: `p${nextId++}`, value: s.value }]
  })
  if (!added.length) return { count: 0, value: 0 }
  stacks = [...stacks, ...added]
  const value = added.reduce((n, s) => n + s.value, 0)
  inventory += value
  emitInventory()
  return { count: added.length, value }
}

export function step(dt) {
  for (const p of poops) p.age += dt
  while (poops.length && poops[0].age > POOP_LIFE) poops.shift()
}

// What systems/net.js saves for a signed-in player: money, lifetime counters and one
// { type, value } per held poop.
export function getProgress() {
  return { money, totalEarned, totalPoops, poops: stacks.map((s) => ({ type: s.type, value: s.value })) }
}

// Replaces money, counters and the inventory with a saved doc (net.js `progress`).
// `foods` is shop.js's FOODS, passed in so a poop gets its name and colour back.
export function hydrate(d, foods) {
  const num = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback)
  money = num(d.money, money)
  totalEarned = num(d.totalEarned, totalEarned)
  totalPoops = num(d.totalPoops, totalPoops)
  stacks = (Array.isArray(d.poops) ? d.poops : []).slice(0, MAX_POOPS).flatMap((s) => {
    const food = foods.find((f) => f.id === s.type)
    if (!food && s.type !== PLAIN.key) return []
    const kind = food ? { type: food.id, name: `${food.effect} Poop`, color: food.color } : { ...PLAIN, type: PLAIN.key }
    return [{ ...kind, key: `p${nextId++}`, value: s.value }]
  })
  selectedStack = null
  inventory = stacks.reduce((n, s) => n + s.value, 0)
  emitInventory()
  for (const fn of listeners) fn(money)
}
