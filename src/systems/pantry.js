// Foods the player has bought, shown as the bottom-centre hotbar
// (components/FoodBar.jsx). Slots keep first-purchase order; `count` is how
// many of that food are held. Framework-free; the bar subscribes through
// useSyncExternalStore, so getPantry returns a new snapshot only on change.
let slots = [] // { id, count }
let selected = null // food id or null
let snapshot = { slots, selected }
const listeners = new Set()

function emit() {
  snapshot = { slots, selected }
  for (const fn of listeners) fn()
}

export function subscribePantry(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getPantry() {
  return snapshot
}

// Total foods held (every slot's count).
export function getFoodCount() {
  return slots.reduce((n, s) => n + s.count, 0)
}

export function addFood(id) {
  const i = slots.findIndex((s) => s.id === id)
  slots =
    i < 0
      ? [...slots, { id, count: 1 }]
      : slots.map((s, j) => (j === i ? { ...s, count: s.count + 1 } : s))
  emit()
}

// Merges saved foods ([{ id, count }], see systems/foodFx.js) back into the pantry.
export function restoreFoods(saved) {
  for (const { id, count } of saved) {
    const i = slots.findIndex((s) => s.id === id)
    slots =
      i < 0
        ? [...slots, { id, count }]
        : slots.map((s, j) => (j === i ? { ...s, count: s.count + count } : s))
  }
  emit()
}

// Picks a food; picking the already-selected one puts it away.
export function toggleSelect(id) {
  selected = selected === id ? null : id
  emit()
}

export function selectSlot(index) {
  if (slots[index]) toggleSelect(slots[index].id)
}

// Uses up one of the selected food (called when a poop is made with it); returns its
// id, or null when nothing is selected. A food that runs out is removed and deselected.
export function consumeSelected() {
  const id = selected
  if (!id) return null
  slots = slots.flatMap((s) => (s.id !== id ? [s] : s.count > 1 ? [{ ...s, count: s.count - 1 }] : []))
  if (!slots.some((s) => s.id === id)) selected = null
  emit()
  return id
}
