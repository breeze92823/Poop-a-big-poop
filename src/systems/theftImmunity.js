// Theft Immunity, bought once at the Locked Jar: nobody can steal your poop, and you can't
// steal either. Permanent for a signed-in player (systems/net.js saves and restores it);
// a guest keeps it for the session only. Framework-free.
import { spendMoney } from './poop.js'
import { showActionResult } from './actionResult.js'

export const JAR_COST = 1000

let owned = false
const listeners = new Set()

export function hasTheftImmunity() {
  return owned
}

export function subscribeImmunity(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function set() {
  owned = true
  for (const fn of listeners) fn(owned)
}

// Hold-E action at the jar.
export function buyTheftImmunity() {
  if (owned) return showActionResult('Already protected', false)
  if (!spendMoney(JAR_COST)) return showActionResult(`Need $${JAR_COST.toLocaleString()}`, false)
  set()
  showActionResult('Theft Immunity bought!', true)
}

// A saved account's flag (net.js `progress`). One-way: a stale `false` can't remove it.
export function hydrateImmunity(saved) {
  if (saved === true && !owned) set()
}
