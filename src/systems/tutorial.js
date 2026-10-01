// First-run tutorial: a short chain of steps (data/tutorial.js) that advances on real game
// events — the timing meter appearing, a poop dropped, poop sold, a food bought, a poop made with a food — and is shown
// as the top-centre banner (components/Tutorial.jsx). Framework-free; the banner subscribes
// through useSyncExternalStore (getTutorial returns a fresh snapshot only when something changed).
//
// Whether it was finished is remembered per identity: a signed-in player's flag is saved on
// the server with the rest of their progress (systems/net.js `tutorialDone`), so it holds
// across devices and the banner stays hidden until the server has answered; a guest (or a
// build with no server) keeps it in localStorage, except with VITE_DEV_MODE=true, where nothing is
// stored locally and the tutorial runs again on every load. VITE_NO_TUTORIAL=true turns it all off.
import { authState, getStableUserId, subscribeAuth } from './bloxity.js'
import { getProgress, subscribeMoney, subscribePoopDrop } from './poop.js'
import { getPantry, subscribePantry } from './pantry.js'
import { getBoost, subscribeBoost } from './boost.js'
import { SERVER_URL } from '../data/net.js'
import { DEV_MODE } from '../data/bloxity.js'
import { BOOST_NOTICE_MS, COMPLETE_MS, TUTORIAL_ENABLED, TUTORIAL_STEPS } from '../data/tutorial.js'

const KEY = 'poop_tutorial_done'

function loadLocal() {
  if (DEV_MODE) return false // dev: always start the tutorial fresh
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false // storage blocked: the tutorial just shows again next load
  }
}

function saveLocal() {
  if (DEV_MODE) return
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* storage blocked */
  }
}

let done = !TUTORIAL_ENABLED || loadLocal()
let index = 0
let celebrating = false // "Tutorial Complete" is up
let notice = false // the red size-boost reminder, shown first
let serverAnswered = false // net.js delivered `progress` / `noProgress` for the signed-in id
let celebrateTimer = 0
let snapshot = null
const listeners = new Set()

function emit() {
  snapshot = null
  for (const fn of listeners) fn()
}

export function subscribeTutorial(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Whether we know yet if THIS player has finished it: a guest or a server-less build knows
// at once (after auth settles); a signed-in player on a server waits for their saved doc.
function resolved() {
  if (!authState.ready) return false
  return !getStableUserId() || !SERVER_URL || serverAnswered
}

export function getTutorial() {
  if (!snapshot) {
    const step = TUTORIAL_STEPS[index]
    snapshot = {
      visible: TUTORIAL_ENABLED && (celebrating || (!done && resolved())),
      celebrating,
      notice,
      step: celebrating ? null : step, // { id, title, hint, target? }
      index,
      total: TUTORIAL_STEPS.length,
    }
  }
  return snapshot
}

// Whether the tutorial is currently on its buy step (the Food Shop discounts the first food then).
export function isBuyStep() {
  const t = getTutorial()
  return t.visible && t.step?.id === 'buy'
}

// What systems/net.js saves for a signed-in player.
export function isTutorialDone() {
  return done
}

// Step the tutorial is on, TUTORIAL_STEPS.length once finished (saved as `tutorialStep`;
// the backend only ever raises it).
export function getTutorialStep() {
  return done ? TUTORIAL_STEPS.length : index
}

function finish(celebrate) {
  if (done) return
  done = true
  saveLocal()
  if (celebrate) {
    celebrating = true
    notice = true
    celebrateTimer = setTimeout(() => {
      notice = false
      emit()
      celebrateTimer = setTimeout(() => {
        celebrating = false
        emit()
      }, COMPLETE_MS)
    }, BOOST_NOTICE_MS)
  }
  emit()
}

// Leaves the tutorial without finishing the steps (the banner's Skip button).
export function skipTutorial() {
  if (TUTORIAL_ENABLED) finish(false)
}

// Hud.jsx reports meter milestones that no system emits (the timing meter appearing).
export function reportTutorialEvent(id) {
  advance(id)
}

function advance(id) {
  if (done || TUTORIAL_STEPS[index]?.id !== id) return
  index += 1
  if (index >= TUTORIAL_STEPS.length) finish(true)
  else {
    emit()
    checkBoost()
  }
}

// The boost step is met by claiming, or by having already claimed today (nothing left to claim).
function checkBoost() {
  if (!done && TUTORIAL_STEPS[index]?.id === 'boost' && getBoost().claimedToday) advance('boost')
}

// net.js, once per sign-in: the saved doc's flag, or undefined for a brand-new account
// (`noProgress`), and the saved step. The server already counts an account that predates the
// tutorial (it has earnings but no step) as finished. A flag never reverts, so a stale `false`
// can't un-finish a finished one.
export function hydrateTutorial(saved, savedStep = 0) {
  serverAnswered = true
  if (saved === true || savedStep >= TUTORIAL_STEPS.length) {
    finish(false)
    return
  }
  // Resume where they left off. The meter steps (hold, poop) restart at the first, and the
  // eat step resumes at buy, since the pantry is not saved and may be empty.
  const resumeAt = { 0: 0, 1: 0, 2: 2, 3: 3, 4: 3, 5: 5 }[savedStep] ?? 0
  if (!done && index < resumeAt) index = resumeAt
  emit()
  checkBoost() // resolved(): the banner may show now
}

// --- Step triggers ----------------------------------------------------------
let lastEarned = getProgress().totalEarned
const countFoods = () => getPantry().slots.reduce((n, s) => n + s.count, 0)
let lastFoods = countFoods()

if (TUTORIAL_ENABLED) {
  subscribePoopDrop((type) => {
    advance('poop')
    if (type !== 'plain') advance('eat')
  })
  subscribeMoney(() => {
    const earned = getProgress().totalEarned
    if (earned > lastEarned) advance('sell')
    lastEarned = earned
  })
  subscribePantry(() => {
    const foods = countFoods()
    if (foods > lastFoods) advance('buy')
    lastFoods = foods
  })
  subscribeBoost(checkBoost)
  // Auth settling (or a sign-in/out) changes whether we can show it yet.
  subscribeAuth(() => emit())
}
