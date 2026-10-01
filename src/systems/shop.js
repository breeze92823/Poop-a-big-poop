// Buy Food shop state: open/closed flag, the food catalogue with live stock, the
// restock countdown and purchases. Framework-free; components/FoodShop.jsx
// subscribes through useSyncExternalStore (getShop returns a fresh snapshot
// object only when something changed).
import { spendMoney } from './poop.js'
import { addFood } from './pantry.js'
import { showActionResult } from './actionResult.js'

export const RESTOCK_SECONDS = 131 // "New foods in 2m 11s" in the reference

// color = tint of the poop it produces, stat = what the multiplier applies to ("VALUE" / "SIZE"), type = mutation
// category, price null = permanently out of stock (stock 0 on every restock).
export const FOODS = [
  { id: 'lettuce', color: '#5fbf4a', name: 'Lettuce', icon: '🥬', price: 20, stock: 1, mult: 3, stat: 'VALUE', effect: 'Green', type: 'Material', rarity: 'Common' },
  { id: 'donut', color: '#c9ccd2', name: 'Glazed Donut', icon: '🍩', price: 5000, stock: 1, mult: 5, stat: 'VALUE', effect: 'Silver', type: 'Material', rarity: 'Common' },
  { id: 'hotsauce', color: '#ff5a1f', name: 'Hot Sauce', icon: '🌶️', price: null, stock: 0, mult: 6, stat: 'VALUE', effect: 'Flaming', type: 'Aura', rarity: 'Uncommon' },
  { id: 'cola', color: '#3b2a22', name: 'Cola', icon: '🥤', price: null, stock: 0, mult: 8, stat: 'VALUE', effect: 'Smokey', type: 'Aura', rarity: 'Uncommon' },
  { id: 'banana', color: '#f2d23a', name: 'Banana', icon: '🍌', price: null, stock: 0, mult: 2, stat: 'SIZE', effect: 'HUGE', type: 'Size', rarity: 'Uncommon' },
  { id: 'milk', color: '#f4f1e6', name: 'Milk', icon: '🥛', price: null, stock: 0, mult: 12, stat: 'VALUE', effect: 'Moisty', type: 'Aura', rarity: 'Rare' },
  { id: 'goldapple', color: '#f0b92a', name: 'Golden Apple', icon: '🍎', price: null, stock: 0, mult: 20, stat: 'VALUE', effect: 'Golden', type: 'Material', rarity: 'Legendary' },
  { id: 'energy', color: '#37d6ff', name: 'Energy Drink', icon: '🥫', price: null, stock: 0, mult: 24, stat: 'VALUE', effect: 'Zappy', type: 'Aura', rarity: 'Legendary' },
  { id: 'pizza', color: '#d9d4ff', name: 'Pizza', icon: '🍕', price: null, stock: 0, mult: 30, stat: 'VALUE', effect: 'Ghost', type: 'Material', rarity: 'Prismatic' },
]

const freshStock = () => Object.fromEntries(FOODS.map((f) => [f.id, f.stock]))

let open = false
let stock = freshStock()
let restockAt = performance.now() + RESTOCK_SECONDS * 1000
let timer = null
let snapshot = null
const listeners = new Set()

function emit() {
  snapshot = null
  for (const fn of listeners) fn()
}

function secondsLeft() {
  return Math.max(0, Math.ceil((restockAt - performance.now()) / 1000))
}

function tick() {
  if (performance.now() >= restockAt) {
    stock = freshStock()
    restockAt = performance.now() + RESTOCK_SECONDS * 1000
  }
  emit()
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

export function buyFood(id) {
  const food = FOODS.find((f) => f.id === id)
  if (!food) return
  if (stock[id] <= 0 || food.price == null) return showActionResult('Out of stock', false)
  if (!spendMoney(food.price)) return showActionResult('Not enough money', false)
  stock = { ...stock, [id]: stock[id] - 1 }
  addFood(id)
  showActionResult(`Bought ${food.name}`, true)
  emit()
}
