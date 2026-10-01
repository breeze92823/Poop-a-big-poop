import { player } from './playerState.js'

// Tap-to-poop: each tap drops a poop behind the player and pays out cash.
// Plain module state, mutated in place; the frame loop reads `poops`
// directly and the HUD subscribes to the money total.
export const POOP_VALUE = 0.01 // $ per poop
export const POOP_LIFE = 8 // s a poop stays on the grass
const MAX_POOPS = 48
const DROP_BEHIND = 0.45 // m behind the player's feet

export const poops = [] // { x, y, z, yaw, size, age }

let money = 0
const listeners = new Set()

export function getMoney() {
  return money
}

export function subscribeMoney(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function dropPoop() {
  const { position, facing } = player
  if (poops.length >= MAX_POOPS) poops.shift()
  poops.push({
    x: position.x - Math.sin(facing) * DROP_BEHIND,
    y: position.y,
    z: position.z - Math.cos(facing) * DROP_BEHIND,
    yaw: Math.random() * Math.PI * 2,
    size: 0.32 + Math.random() * 0.08,
    age: 0,
  })
  money = Math.round((money + POOP_VALUE) * 100) / 100
  for (const fn of listeners) fn(money)
}

export function step(dt) {
  for (const p of poops) p.age += dt
  while (poops.length && poops[0].age > POOP_LIFE) poops.shift()
}
