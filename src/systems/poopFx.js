// Poop-burst effect bus. Framework-free: the local player's drop (components/Player.jsx) and every
// remote player's drop (systems/net.js, on their `poopSeq` bump) emit here, and
// components/PoopBurst.jsx draws them.
const listeners = new Set()

export function subscribePoopBurst(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// { x, y, z } feet position, `facing` yaw the character faces, `height` its height (m),
// `color` CSS colour. The burst goes out the back.
export function emitPoopBurst(burst) {
  for (const fn of listeners) fn(burst)
}
