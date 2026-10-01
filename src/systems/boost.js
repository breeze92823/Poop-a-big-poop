// Daily Size Boost state: open/closed flag, the claim streak and the active boost. Claiming
// once per local day starts a 15-minute boost that multiplies the size (yield) of every poop
// dropped; consecutive days raise the multiplier, missing a day resets the streak. Framework-free;
// components/SizeBoost.jsx subscribes through useSyncExternalStore (getBoost returns a fresh
// snapshot only when something changed). Progress is kept in localStorage (never throws).
import { showActionResult } from './actionResult.js'
import { spendMoney } from './poop.js' // circular with poop.js, fine: both only call each other at runtime

export const SKIP_COST = 500000 // $ to unlock the next claim early
export const BOOST_MINUTES = 15
export const BOOST_MS = BOOST_MINUTES * 60 * 1000
export const DAY_MULTS = [2, 2.5, 3, 3.5, 4, 4.5, 5] // day 7 and later stay at the last entry
export const multForDay = (day) => DAY_MULTS[Math.min(Math.max(day, 1), DAY_MULTS.length) - 1]

const KEY = 'poop_size_boost'

const startOfDay = (t, plus = 0) => {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + plus)
  return d.getTime()
}

// streak: days claimed in a row. nextClaimAt: when the next claim unlocks (next local midnight,
// or now after "Skip Timer"). streakEnd: claiming after this moment starts over at day 1.
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    if ([s.streak, s.nextClaimAt, s.streakEnd, s.boostEndsAt].every(Number.isFinite)) return s
  } catch {
    /* no saved progress, or storage unavailable */
  }
  return { streak: 0, nextClaimAt: 0, streakEnd: 0, boostEndsAt: 0 }
}

let data = load()
let open = false
let timer = null
let snapshot = null
const listeners = new Set()

function save() {
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

// Streak as shown: a lapsed streak reads as 0 until the next claim restarts it.
function liveStreak(now) {
  return data.streak > 0 && now <= data.streakEnd ? data.streak : 0
}

// Current multiplier applied to dropped poops (1 when no boost is running).
export function getBoostMult() {
  return Date.now() < data.boostEndsAt ? multForDay(data.streak) : 1
}

export function subscribeBoost(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getBoost() {
  if (!snapshot) {
    const now = Date.now()
    const streak = liveStreak(now)
    const left = Math.max(0, data.boostEndsAt - now)
    snapshot = {
      open,
      streak,
      canClaim: now >= data.nextClaimAt,
      claimedToday: streak > 0 && now < data.nextClaimAt,
      active: left > 0,
      mult: left > 0 ? multForDay(data.streak) : 1,
      secondsLeft: Math.ceil(left / 1000),
      nextMult: multForDay(streak + 1),
    }
  }
  return snapshot
}

export function isBoostOpen() {
  return open
}

export function openBoost() {
  if (open) return
  open = true
  timer = setInterval(emit, 1000)
  emit()
}

export function closeBoost() {
  if (!open) return
  open = false
  clearInterval(timer)
  timer = null
  emit()
}

export function claimBoost() {
  const now = Date.now()
  if (now < data.nextClaimAt) return showActionResult('Already claimed today', false)
  const streak = liveStreak(now) + 1
  data = {
    streak,
    nextClaimAt: startOfDay(now, 1),
    streakEnd: startOfDay(now, 2) - 1, // the whole of tomorrow still counts
    boostEndsAt: now + BOOST_MS,
  }
  save()
  showActionResult(`${multForDay(streak)}x Size Boost for ${BOOST_MINUTES} min`, true)
  emit()
}

// Pays SKIP_COST to unlock the next claim immediately (the streak window is unchanged).
export function skipTimer() {
  if (Date.now() >= data.nextClaimAt) return
  if (!spendMoney(SKIP_COST)) return showActionResult('Not enough money', false)
  data = { ...data, nextClaimAt: Date.now() }
  save()
  emit()
}

// The claim state systems/net.js saves for a signed-in player.
export function getBoostData() {
  return { ...data }
}

// Adopts a saved claim state (net.js `progress`) unless this browser's own is newer, judged
// by the boost end time (a claim only ever moves it forward; "Skip Timer" doesn't touch it).
export function hydrateBoost(d) {
  if (!d || ![d.streak, d.nextClaimAt, d.streakEnd, d.boostEndsAt].every(Number.isFinite)) return
  if (d.boostEndsAt < data.boostEndsAt) return
  data = { streak: d.streak, nextClaimAt: d.nextClaimAt, streakEnd: d.streakEnd, boostEndsAt: d.boostEndsAt }
  save()
  emit()
}
