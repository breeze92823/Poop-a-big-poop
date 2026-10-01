// Forced update: the room told us this build is older than its minimum (net.js `reload`).
// components/UpdateNotice.jsx shows a countdown, then the page reloads onto the new deploy.
// Framework-free. A reload that doesn't clear the message (the host still serving the old build)
// must not loop, so a second request within LOOP_GUARD_MS asks for a manual refresh instead.
const RELOAD_DELAY_S = 5
const LOOP_GUARD_MS = 2 * 60 * 1000
const KEY = 'poop-update-reload-at'

// seconds: counting down to the reload; manual: gave up auto-reloading, ask the player to refresh.
let state = { active: false, seconds: 0, manual: false }
const listeners = new Set()
let timer = null

function set(next) {
  state = next
  for (const fn of listeners) fn()
}

export function subscribeUpdate(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getUpdate() {
  return state
}

function recentlyReloaded() {
  try {
    return Date.now() - Number(sessionStorage.getItem(KEY) || 0) < LOOP_GUARD_MS
  } catch {
    return false
  }
}

export function startUpdateReload() {
  if (state.active) return
  if (recentlyReloaded()) return set({ active: true, seconds: 0, manual: true })
  set({ active: true, seconds: RELOAD_DELAY_S, manual: false })
  timer = setInterval(() => {
    if (state.seconds > 1) return set({ ...state, seconds: state.seconds - 1 })
    clearInterval(timer)
    timer = null
    try {
      sessionStorage.setItem(KEY, String(Date.now()))
    } catch {
      // Storage blocked: the guard just won't apply.
    }
    window.location.reload()
  }, 1000)
}
