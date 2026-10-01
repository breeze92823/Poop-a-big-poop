// Sell Poop modal state: open/closed flag only (the quotes come from systems/poop.js).
// Opened by holding E at the Sell stall (systems/interact.js); components/SellPoop.jsx
// subscribes through useSyncExternalStore.
let open = false
const listeners = new Set()

export function subscribeSell(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getSellOpen() {
  return open
}

export function openSell() {
  if (open) return
  open = true
  for (const fn of listeners) fn()
}

export function closeSell() {
  if (!open) return
  open = false
  for (const fn of listeners) fn()
}
