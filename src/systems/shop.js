// Buy Food shop state: open/closed flag, the food catalogue with live stock, the
// restock countdown and purchases. Framework-free; components/FoodShop.jsx
// subscribes through useSyncExternalStore (getShop returns a fresh snapshot
// object only when something changed).
//
// The shelf is shared by every player: online, the room (backend src/shop.ts)
// owns the stock and pushes it through net.js -> applyServerShop, and a purchase
// is only paid once the room confirms it got a unit. Offline the same schedule
// is computed from the clock and played locally.
import { getLastSale, getMoney, spendMoney } from './poop.js'
import { isBuyStep } from './tutorial.js'
import { FIRST_FOOD } from '../data/tutorial.js'
import { addFood } from './pantry.js'
import { showActionResult } from './actionResult.js'
import { DEV_MODE } from '../data/bloxity.js'

export const RESTOCK_SECONDS = 240 // "New foods in 4m 0s"; keep == backend RESTOCK_MS
const RESTOCK_MS = RESTOCK_SECONDS * 1000
const RESTOCKS_PER_HOUR = 3600 / RESTOCK_SECONDS // 15

// Restocks (of 15 per hour) on which a food of that rarity is on the shelf, and
// how many units then. Keep == backend SHOP_RARITY.
export const SHOP_RARITY = {
  Common: { perHour: 15, qty: 6 },
  Uncommon: { perHour: 10, qty: 4 },
  Rare: { perHour: 6, qty: 3 },
  Legendary: { perHour: 3, qty: 2 },
  Prismatic: { perHour: 2, qty: 1 },
}

// color = tint of the poop it produces, stat = what the multiplier applies to ("VALUE" / "SIZE"), type = mutation
// category, price null = not for sale (never stocked).
export const FOODS = [
  { id: 'lettuce', color: '#5fbf4a', name: 'Lettuce', icon: '🥬', price: 20, mult: 3, stat: 'VALUE', effect: 'Green', type: 'Material', rarity: 'Common' },
  { id: 'donut', color: '#c9ccd2', name: 'Glazed Donut', icon: '🍩', price: 5000, mult: 5, stat: 'VALUE', effect: 'Silver', type: 'Material', rarity: 'Common' },
  { id: 'hotsauce', color: '#ff5a1f', name: 'Hot Sauce', icon: '🌶️', price: 12000, mult: 6, stat: 'VALUE', effect: 'Flaming', type: 'Aura', rarity: 'Uncommon' },
  { id: 'cola', color: '#3b2a22', name: 'Cola', icon: '🥤', price: 40000, mult: 8, stat: 'VALUE', effect: 'Smokey', type: 'Aura', rarity: 'Uncommon' },
  { id: 'banana', color: '#f2d23a', name: 'Banana', icon: '🍌', price: 10, mult: 2, stat: 'SIZE', effect: 'HUGE', type: 'Size', rarity: 'Uncommon' },
  { id: 'milk', color: '#f4f1e6', name: 'Milk', icon: '🥛', price: 250000, mult: 12, stat: 'VALUE', effect: 'Moisty', type: 'Aura', rarity: 'Rare' },
  { id: 'goldapple', color: '#f0b92a', name: 'Golden Apple', icon: '🍎', price: 2500000, mult: 20, stat: 'VALUE', effect: 'Golden', type: 'Material', rarity: 'Legendary' },
  { id: 'energy', color: '#37d6ff', name: 'Energy Drink', icon: '🥫', price: 6000000, mult: 24, stat: 'VALUE', effect: 'Zappy', type: 'Aura', rarity: 'Legendary' },
  { id: 'pizza', color: '#d9d4ff', name: 'Pizza', icon: '🍕', price: 20000000, mult: 30, stat: 'VALUE', effect: 'Ghost', type: 'Material', rarity: 'Prismatic' },
]

// --- Offline schedule (mirror of backend src/shop.ts) ------------------------
function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}

function mulberry32(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function slotsFor(hour, foodId, perHour) {
  const rand = mulberry32(hash(`${hour}:${foodId}`))
  const slots = Array.from({ length: RESTOCKS_PER_HOUR }, (_, i) => i)
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[slots[i], slots[j]] = [slots[j], slots[i]]
  }
  return new Set(slots.slice(0, perHour))
}

function stockForCycle(cycle) {
  const hour = Math.floor(cycle / RESTOCKS_PER_HOUR)
  const slot = cycle - hour * RESTOCKS_PER_HOUR
  return Object.fromEntries(
    FOODS.map((f) => {
      const { perHour, qty } = SHOP_RARITY[f.rarity]
      return [f.id, f.price != null && slotsFor(hour, f.id, perHour).has(slot) ? qty : 0]
    }),
  )
}

// --- State ------------------------------------------------------------------
let online = false // true while the room's shelf is the source of truth
let cycle = -1 // offline only
let serverCycle = -1 // restock number last pushed by the room
let stock = Object.fromEntries(FOODS.map((f) => [f.id, 0]))
let restockAt = performance.now() // performance.now() at which the shelf restocks
let pending = false // an online purchase awaiting the room's answer
let sendBuy = null // set by net.js: (id) => boolean sent
let timer = null
let open = false
let snapshot = null
const listeners = new Set()

function emit() {
  snapshot = null
  for (const fn of listeners) fn()
}

function secondsLeft() {
  return Math.max(0, Math.ceil((restockAt - performance.now()) / 1000))
}

// Offline: roll the local shelf over to the clock's current restock.
function syncLocal() {
  const c = Math.floor(Date.now() / RESTOCK_MS)
  if (c === cycle) return false
  const restocked = cycle >= 0 || DEV_MODE // dev: also announce the first shelf
  cycle = c
  stock = stockForCycle(c)
  restockAt = performance.now() + ((c + 1) * RESTOCK_MS - Date.now())
  if (restocked) announceRestock()
  return true
}

// Top-centre popup, whether or not the shop is open.
function announceRestock() {
  showActionResult('The Food Shop has been restocked!', true)
}

function tick() {
  if (!online) syncLocal()
  emit()
}

// Offline restocks are noticed by a clock check; online ones arrive from the room.
setInterval(() => {
  if (!online && !open && syncLocal()) emit()
}, 1000)

// net.js: the room's shelf ({ stock, endsInMs }), pushed on join, restock and every purchase.
export function applyServerShop(data) {
  if (!data || typeof data.stock !== 'object' || data.stock === null) return
  online = true
  if (data.cycle !== serverCycle) {
    if (serverCycle >= 0 || DEV_MODE) announceRestock()
    serverCycle = data.cycle
  }
  stock = Object.fromEntries(FOODS.map((f) => [f.id, Number(data.stock[f.id]) || 0]))
  restockAt = performance.now() + (Number(data.endsInMs) || 0)
  emit()
}

// net.js: the room was lost; fall back to the local schedule.
export function shopOffline() {
  online = false
  pending = false
  serverCycle = -1
  cycle = -1
  syncLocal()
  emit()
}

// net.js: the room's answer to a buy request.
export function applyBuyResult(msg) {
  pending = false
  const food = FOODS.find((f) => f.id === msg?.id)
  if (!food) return
  if (!msg.ok) return showActionResult('Out of stock', false)
  if (!spendMoney(foodPrice(food))) return showActionResult('Not enough money', false)
  addFood(food.id)
  showActionResult(`Bought ${food.name}`, true)
}

// What a food costs right now. Only on the tutorial's buy step, the first food is
// discounted to what the player earned on their last sale (never above its price).
export function foodPrice(food) {
  const sale = getLastSale()
  if (food.name === FIRST_FOOD.name && isBuyStep() && sale > 0) return Math.min(food.price, Math.round(sale * 100) / 100)
  return food.price
}

export function setServerBuy(fn) {
  sendBuy = fn
}

export function subscribeShop(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getShop() {
  if (!snapshot) snapshot = { open, stock, seconds: secondsLeft() }
  return snapshot
}

export function isShopOpen() {
  return open
}

export function openShop() {
  if (open) return
  open = true
  if (!online) syncLocal()
  timer = setInterval(tick, 1000)
  emit()
}

export function closeShop() {
  if (!open) return
  open = false
  clearInterval(timer)
  timer = null
  emit()
}

// Units of a food the player can buy right now. On the tutorial's buy step the first food
// always has at least 1, even if the shared shelf is empty.
export function stockOf(id) {
  const food = FOODS.find((f) => f.id === id)
  const n = stock[id] || 0
  return n <= 0 && food?.name === FIRST_FOOD.name && isBuyStep() ? 1 : n
}

export function buyFood(id) {
  const food = FOODS.find((f) => f.id === id)
  if (!food) return
  if (!online) syncLocal()
  if (stockOf(id) <= 0 || food.price == null) return showActionResult('Out of stock', false)
  const tutorialUnit = stock[id] <= 0 // a unit the tutorial grants on an empty shelf
  if (online) {
    if (pending) return
    if (getMoney() < foodPrice(food)) return showActionResult('Not enough money', false)
    pending = true
    if (sendBuy && sendBuy(id, tutorialUnit)) return
    pending = false
  }
  if (!spendMoney(foodPrice(food))) return showActionResult('Not enough money', false)
  if (!tutorialUnit) stock = { ...stock, [id]: stock[id] - 1 }
  addFood(id)
  showActionResult(`Bought ${food.name}`, true)
  emit()
}
