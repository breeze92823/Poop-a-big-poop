// Multiplayer presence and progress saving. Framework-free (no React import) —
// the ONLY module that talks to the Colyseus server (../Poop-a-big-poop-backend's
// LobbyRoom). Like systems/bloxity.js, every path through here is built so a
// slow, asleep or absent server leaves the game fully playable solo: nothing
// blocks gameplay and the scene never waits on a socket.
//
// Relays position/yaw/gait (`move`), the avatar (`setAvatar`) and live stats;
// exposes the remote roster that components/RemotePlayers.jsx renders. For a
// signed-in player it also saves (`saveProgress`) and restores (`progress`)
// money, the poop inventory, the Daily Size Boost, the Save Food Effects
// stall and whether the first-run tutorial is done. The pantry is deliberately NOT saved: foods only outlive a reload when
// the player pays at the Save Food stall (systems/foodFx.js), which is what
// `savedFoods` carries.
import {
  authState,
  subscribeAuth,
  getStableUserId,
  getDisplayName,
  getEquippedAvatar,
  getProportions,
  onAvatarChanged,
  onProportionsChanged,
} from './bloxity.js'
import { DEV_MODE } from '../data/bloxity.js'
import { player } from './playerState.js'
import { applyChestState, chestOffline, onChestAnim, onChestClaim, onChestResult, setChestSender } from './chest.js'
import {
  getProgress,
  hydrate as hydratePoop,
  subscribeInventory,
  subscribeMoney,
  subscribePoopDrop,
  spendMoney,
  refundMoney,
  takeAllPoops,
  addPoops,
} from './poop.js'
import { showActionResult } from './actionResult.js'
import { hasTheftImmunity, hydrateImmunity, subscribeImmunity } from './theftImmunity.js'
import { playFart } from './sfx.js'
import { emitPoopBurst } from './poopFx.js'
import { PALETTE } from '../materials/tile.js'
import { getBoostData, hydrateBoost, subscribeBoost } from './boost.js'
import { getSavedFoods, hydrateSavedFoods, subscribeFoodFx } from './foodFx.js'
import { getTutorialStep, hydrateTutorial, isTutorialDone, subscribeTutorial } from './tutorial.js'
import { FOODS, applyServerShop, applyBuyResult, setServerBuy, shopOffline } from './shop.js'
import {
  SERVER_URL,
  ROOM_NAME,
  JOIN_TIMEOUT_MS,
  RETRY_BACKOFF_MS,
  STATS_RESEND_DEBOUNCE_MS,
  PROGRESS_RESEND_DEBOUNCE_MS,
  MOVE_SEND_INTERVAL_MS,
  USERNAME_WAIT_MS,
  STEAL_COST,
  STEAL_RANGE,
} from '../data/net.js'

// --- Public state -----------------------------------------------------------
//   'idle'       — not started / torn down / no server configured
//   'connecting' — a join attempt is in flight
//   'solo'       — between retry attempts; playing single-player right now
//   'online'     — attached to a room
export const netState = { status: 'idle', playerCount: 0, error: null }

const listeners = new Set()

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function emit() {
  for (const fn of listeners) {
    try {
      fn(netState)
    } catch {
      // A broken subscriber must not wedge the netcode.
    }
  }
}

function setStatus(status) {
  netState.status = status
  emit()
}

// --- Remote players ---------------------------------------------------------
// sessionId -> the OTHER player's live PlayerState schema instance. Colyseus
// patches its fields in place, so a consumer reads e.g. `p.x` every frame with
// no callback; only add/remove needs one (a component must mount/unmount).
const remotePlayers = new Map()
const rosterListeners = new Set()

function notifyRoster(kind, sessionId, p) {
  for (const l of rosterListeners) {
    try {
      l[kind](sessionId, p)
    } catch {
      // A broken subscriber must not wedge the netcode.
    }
  }
}

// Replays the current roster immediately, so a component mounting after we're
// already online doesn't miss whoever is already here.
export function subscribeRoster(onAdd, onRemove) {
  const entry = { onAdd, onRemove }
  rosterListeners.add(entry)
  for (const [sessionId, p] of remotePlayers) onAdd(sessionId, p)
  return () => rosterListeners.delete(entry)
}

// The remote player within `range` m of (x, z) that holds poop, nearest first, or null.
// Returns { id, name, blockedMs } so interact.js can build its prompt without touching schema
// fields; blockedMs > 0 means they robbed us recently and we can't rob them back yet.
export function nearestStealTarget(x, z, range = STEAL_RANGE) {
  const now = Date.now()
  let best = null
  let bestD = range
  for (const [id, p] of remotePlayers) {
    if (!(p.poopCount > 0) || p.immune) continue
    const d = Math.hypot(p.x - x, p.z - z)
    if (d <= bestD) {
      best = { id, name: p.username || 'Player', blockedMs: Math.max(0, (stealBlocks.get(id) || 0) - now) }
      bestD = d
    }
  }
  return best
}

// Pays STEAL_COST up front and asks the room to rob `targetId`; the answer arrives as
// `stealResult` (refund on failure) and the victim's poop moves into our inventory.
let stealing = false
let stealTarget = ''
// sessionId of a player who robbed us -> epoch ms (local clock) until we may rob them back.
const stealBlocks = new Map()

export function requestSteal(targetId) {
  if (stealing) return
  if ((stealBlocks.get(targetId) || 0) > Date.now()) return showActionResult("Can't steal back yet", false)
  if (!room) return showActionResult('Not connected', false)
  if (!spendMoney(STEAL_COST)) return showActionResult(`Need $${STEAL_COST.toLocaleString()} to steal`, false)
  stealing = true
  stealTarget = targetId
  send('steal', { target: targetId })
}

const STEAL_FAIL_TEXT = {
  poor: 'Not enough money',
  far: 'Too far away',
  empty: 'They have no poop',
  immune: 'Theft Immunity blocks it',
  protected: 'They were just robbed',
  cooldown: 'Too soon, try again',
  busy: 'Busy, try again',
  gone: 'Player left',
  revenge: "Can't steal back yet",
  timeout: 'Steal failed',
}

function onStealResult(d) {
  if (!stealing) return
  stealing = false
  if (d?.reason === 'revenge' && d.ms > 0) stealBlocks.set(stealTarget, Date.now() + d.ms)
  if (!d?.ok) {
    refundMoney(STEAL_COST)
    showActionResult(STEAL_FAIL_TEXT[d?.reason] || 'Steal failed', false)
    return
  }
  const { count } = addPoops(Array.isArray(d.poops) ? d.poops : [], FOODS)
  showActionResult(`Stole ${count} poop from ${d.from || 'Player'}!`, true)
}

// The server tells us who we can't rob back after being robbed, and for how long.
function onStealBlock(d) {
  if (typeof d?.target === 'string' && d.ms > 0) stealBlocks.set(d.target, Date.now() + d.ms)
}

// We were robbed: give everything up and tell the room what went.
function onStealRequest(d) {
  send('stealHandover', { poops: takeAllPoops() })
  showActionResult(`${d?.by || 'Someone'} stole all your poop!`, false)
}

// --- Leaderboards -----------------------------------------------------------
// Server push: { money|totalEarned|totalPoops|playTime: [{ id, name, value }] },
// best first. `id` equals our sessionId on our own row, so a board can highlight it.
let lastLeaderboard = null
const leaderboardListeners = new Set()

// Replays the latest payload immediately if one has already arrived.
export function subscribeLeaderboard(fn) {
  leaderboardListeners.add(fn)
  if (lastLeaderboard) fn(lastLeaderboard, selfId)
  return () => leaderboardListeners.delete(fn)
}

// --- Connection state -------------------------------------------------------
let sdkModule = null
let client = null
let room = null
let selfId = ''
let started = false
let stopped = true
let connecting = false
let attempt = 0
let retryTimer = 0

async function loadSdk() {
  if (!sdkModule) sdkModule = await import('@colyseus/sdk')
  return sdkModule
}

function send(type, payload) {
  if (!room) return
  try {
    room.send(type, payload)
  } catch {
    // Socket mid-close — the next attach re-seeds everything anyway.
  }
}

// --- Stats + progress -------------------------------------------------------
function sendStatsNow() {
  const { money, totalEarned, totalPoops, poops } = getProgress()
  send('stats', { money, totalEarned, totalPoops, poopCount: poops.length, immune: hasTheftImmunity() })
}

// Everything the server persists for this player.
function progressPayload() {
  return { ...getProgress(), boost: getBoostData(), savedFoods: getSavedFoods(), tutorialDone: isTutorialDone(), tutorialStep: getTutorialStep(), theftImmune: hasTheftImmunity() }
}

// The ROOM decides whether this session may persist (its userIds map), so a
// save sent just after a logout lands as a harmless no-op there.
function sendProgressNow() {
  send('saveProgress', progressPayload())
}

// Whether the saved doc for the CURRENT identity has been dealt with (applied,
// or the server said there is none). Saves wait on it, or the starting values
// would overwrite a returning player's save. Unlike a timeout this can't lose
// data: with no answer from the server there is simply nothing saved.
let progressLoaded = false
// Applied at most once per IDENTITY: the first `progress` under the current
// sign-in is the real load. A later reattach under the SAME identity would
// otherwise clobber what the player did locally during a blip.
let hydratedFromServer = false

function applyProgress(d) {
  if (hydratedFromServer) return
  hydratedFromServer = true
  progressLoaded = true
  // A doc made only by the server's playtime flush has no save in it yet: keep the local values.
  const saved = d.money > 0 || d.totalEarned > 0 || d.totalPoops > 0 || (d.poops?.length ?? 0) > 0
  try {
    if (saved) hydratePoop(d, FOODS)
    hydrateBoost(d.boost)
    hydrateSavedFoods(d.savedFoods)
    hydrateTutorial(d.tutorialDone, d.tutorialStep)
    hydrateImmunity(d.theftImmune)
  } catch (err) {
    console.warn('[net] could not apply saved progress', err)
  }
  lastProgSnap = JSON.stringify(progressPayload()) // what we just loaded isn't a change to save
  lastSnap = ''
  scheduleStats()
}

let statsTimer = 0
let progressTimer = 0
let lastSnap = ''
let lastProgSnap = ''

function scheduleStats() {
  if (statsTimer) return
  statsTimer = setTimeout(() => {
    statsTimer = 0
    sendStatsNow()
  }, STATS_RESEND_DEBOUNCE_MS)
}

// Every source below fires on far more than it saves (selection, the boost
// window's 1 s tick), so compare snapshots and only send real changes.
function onStateChange() {
  const { money, totalEarned, totalPoops, poops } = getProgress()
  const snap = `${money}|${totalEarned}|${totalPoops}|${poops.length}|${hasTheftImmunity()}`
  if (snap !== lastSnap) {
    lastSnap = snap
    scheduleStats()
  }
  if (!getStableUserId() || !progressLoaded || progressTimer) return
  const prog = JSON.stringify(progressPayload())
  if (prog === lastProgSnap) return
  lastProgSnap = prog
  progressTimer = setTimeout(() => {
    progressTimer = 0
    sendProgressNow()
  }, PROGRESS_RESEND_DEBOUNCE_MS)
}

// --- Avatar + position relay ------------------------------------------------
// Same recipe components/Player.jsx renders the LOCAL player from: the game's
// base character dressed with the signed-in player's equipped Bloxity
// hat/back accessory and SDK proportions. Sent as an opaque JSON string (the
// server never parses it), so components/RemotePlayers.jsx can rebuild an
// identical-looking character for every other session.
function avatarPayload() {
  return {
    equipped: authState.user && !DEV_MODE ? getEquippedAvatar() : null,
    proportions: getProportions(),
  }
}

let lastSentAvatar = ''

function sendAvatarNow() {
  if (!room) return
  const payload = JSON.stringify(avatarPayload())
  if (payload === lastSentAvatar) return
  lastSentAvatar = payload
  send('setAvatar', { avatar: payload })
}

// Local position/facing/gait, throttled out over `move`. Called every frame
// from components/GameLoop.jsx. A no-op while offline.
let moveAccumMs = 0
let lastSentMove = null
const MOVE_EPS = 0.01

export function reportLocal(delta) {
  if (!room) return
  moveAccumMs += delta * 1000
  if (moveAccumMs < MOVE_SEND_INTERVAL_MS) return
  moveAccumMs = 0

  const moveBlend = Math.min(1, Math.hypot(player.velocity.x, player.velocity.z) / player.moveSpeed)
  const next = {
    x: player.position.x,
    y: player.position.y,
    z: player.position.z,
    yaw: player.facing,
    moveBlend,
    grounded: player.grounded,
    bending: player.bending,
  }
  const last = lastSentMove
  if (
    last &&
    Math.abs(next.x - last.x) < MOVE_EPS &&
    Math.abs(next.y - last.y) < MOVE_EPS &&
    Math.abs(next.z - last.z) < MOVE_EPS &&
    Math.abs(next.yaw - last.yaw) < MOVE_EPS &&
    Math.abs(next.moveBlend - last.moveBlend) < MOVE_EPS &&
    next.grounded === last.grounded &&
    next.bending === last.bending
  ) {
    return
  }
  lastSentMove = next
  send('move', next)
}

// --- Identity sync (login/logout mid-session) -------------------------------
// Join options only carry what was true the instant the socket opened; Bloxity
// auth routinely settles later or changes without a reload.
let lastIdentity = { userId: '', username: '' }

function sendIdentityNow() {
  if (!room) return
  const userId = getStableUserId()
  const username = getDisplayName()
  if (userId === lastIdentity.userId && username === lastIdentity.username) return
  // Flush this session's progress under the OLD id before the room forgets it.
  if (lastIdentity.userId && lastIdentity.userId !== userId && progressLoaded) sendProgressNow()
  // A freshly-signed-in id gets its saved doc hydrated, like a brand-new join.
  if (userId !== lastIdentity.userId) {
    hydratedFromServer = false
    progressLoaded = false
  }

  lastIdentity = { userId, username }
  send('identify', { userId, username })
  // Signing in/out flips avatarPayload()'s equipped gate.
  sendAvatarNow()
}

function waitForAuth(ms) {
  if (authState.ready) return Promise.resolve()
  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(t)
      off()
      resolve()
    }
    const off = subscribeAuth((s) => {
      if (s.ready) finish()
    })
    const t = setTimeout(finish, ms)
  })
}

function withTimeout(promise, ms, label) {
  let t
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(label)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t))
}

// --- Connect / attach / retry ---------------------------------------------
async function connect() {
  if (stopped || connecting || room) return
  connecting = true
  clearTimeout(retryTimer)
  retryTimer = 0
  setStatus('connecting')

  try {
    const mod = await loadSdk()
    if (stopped) return
    if (!client) client = new mod.Client(SERVER_URL)

    const joined = await withTimeout(
      client.joinOrCreate(ROOM_NAME, {
        username: getDisplayName(),
        userId: getStableUserId(), // '' for a guest
        // Seeds the server's PlayerState.avatar so others render us correctly
        // from the very first frame.
        avatar: JSON.stringify(avatarPayload()),
      }),
      JOIN_TIMEOUT_MS,
      'join timed out',
    )

    if (stopped) {
      try {
        joined.leave()
      } catch {
        /* nothing to clean up */
      }
      return
    }
    attachRoom(joined)
  } catch (err) {
    connecting = false
    attempt += 1
    netState.error = String((err && err.message) || err)
    if (!stopped) scheduleRetry()
  }
}

function scheduleRetry() {
  if (stopped || room || retryTimer) return
  setStatus('solo')
  const i = Math.min(Math.max(attempt - 1, 0), RETRY_BACKOFF_MS.length - 1)
  retryTimer = setTimeout(() => {
    retryTimer = 0
    connect()
  }, RETRY_BACKOFF_MS[i])
}

function recount() {
  const n = room && room.state && room.state.players ? room.state.players.size : 0
  if (n !== netState.playerCount) {
    netState.playerCount = n
    emit()
  }
}

function attachRoom(joined) {
  room = joined
  connecting = false
  attempt = 0
  selfId = joined.sessionId
  netState.error = null

  room.onLeave(() => handleLeave())
  room.onError((code, message) => {
    netState.error = message || `error ${code}`
  })
  // The saved doc for our Bloxity user id, sent once right after join.
  room.onMessage('progress', applyProgress)
  // A brand-new account has no save: keep the local values and start saving them.
  room.onMessage('noProgress', () => {
    progressLoaded = true
    hydratedFromServer = true
    hydrateTutorial(undefined)
    onStateChange()
  })
  // The shared Buy Food shelf: stock + ms to the next restock, and our buy answers.
  room.onMessage('shop', applyServerShop)
  room.onMessage('buyResult', applyBuyResult)
  setServerBuy((id, tutorial) => {
    if (!room) return false
    send('buyFood', { id, tutorial })
    return true
  })
  room.onMessage('chest', applyChestState)
  room.onMessage('chestAnim', onChestAnim)
  room.onMessage('chestClaim', (d) => {
    const remote = remotePlayers.get(d?.id)
    onChestClaim(d?.id === selfId ? () => player.position : remote ? () => remote : null)
  })
  room.onMessage('chestResult', onChestResult)
  setChestSender(() => {
    if (!room) return false
    send('openChest', {})
    return true
  })
  room.onMessage('stealResult', onStealResult)
  room.onMessage('stealRequest', onStealRequest)
  room.onMessage('stealBlock', onStealBlock)
  room.onMessage('leaderboard', (data) => {
    lastLeaderboard = data || {}
    for (const fn of leaderboardListeners) {
      try {
        fn(lastLeaderboard, selfId)
      } catch {
        // A broken subscriber must not wedge the netcode.
      }
    }
  })

  // Called unconditionally: room.state can still be an empty shell right
  // after joinOrCreate() resolves, and getStateCallbacks() defers registration
  // until the `players` map arrives.
  const $ = sdkModule.getStateCallbacks(room)
  $(room.state).players.onAdd((p, sessionId) => {
    recount()
    if (sessionId === selfId) return
    remotePlayers.set(sessionId, p)
    notifyRoster('onAdd', sessionId, p)
    // Their poopSeq bumps once per drop: play the fart, quieter the farther they are.
    let lastSeq = p.poopSeq
    $(p).listen('poopSeq', (seq) => {
      if (seq === lastSeq) return
      lastSeq = seq
      playFart(Math.hypot(p.x - player.position.x, p.y - player.position.y, p.z - player.position.z))
      emitPoopBurst({ x: p.x, y: p.y, z: p.z, facing: p.yaw, height: player.dims.height, color: FOODS.find((f) => f.id === p.poopType)?.color ?? PALETTE.poop })
    })
  })
  $(room.state).players.onRemove((_p, sessionId) => {
    recount()
    if (sessionId === selfId) return
    remotePlayers.delete(sessionId)
    stealBlocks.delete(sessionId)
    notifyRoster('onRemove', sessionId)
  })

  // A fresh session starts every server field at its default, so re-state ours
  // right away instead of waiting for the next change.
  sendStatsNow()
  lastSentAvatar = ''
  sendAvatarNow()
  lastSentMove = null
  moveAccumMs = MOVE_SEND_INTERVAL_MS // send on the very next reportLocal()
  lastIdentity = { userId: getStableUserId(), username: getDisplayName() }

  recount()
  setStatus('online')
}

function clearRemotePlayers() {
  stealBlocks.clear()
  for (const sessionId of remotePlayers.keys()) notifyRoster('onRemove', sessionId)
  remotePlayers.clear()
}

function handleLeave() {
  room = null
  if (stealing) onStealResult({ ok: false, reason: 'gone' })
  setServerBuy(null)
  chestOffline()
  shopOffline()
  selfId = ''
  connecting = false
  netState.playerCount = 0
  // Those characters belonged to the room we just lost.
  clearRemotePlayers()

  if (stopped) return
  attempt = 0
  scheduleRetry()
}

// --- Lifecycle --------------------------------------------------------------
let offs = []

export function init() {
  if (started) return
  started = true
  stopped = false
  // No server configured for this build: stay 'idle' forever. Every export
  // below already no-ops without a room.
  if (!SERVER_URL) return

  lastProgSnap = JSON.stringify(progressPayload())
  offs = [
    subscribeMoney(onStateChange),
    subscribeInventory(onStateChange),
    subscribeBoost(onStateChange),
    subscribeFoodFx(onStateChange),
    subscribeTutorial(onStateChange),
    subscribeImmunity(onStateChange),
    subscribePoopDrop((type) => send('poop', { type })),
    // subscribeAuth also fires on friends/balance loads; sendIdentityNow()'s own
    // diff check filters those out.
    subscribeAuth(() => sendIdentityNow()),
    // Anything that changes avatarPayload() -> the room, so others see the
    // equip/unequip or proportions edit right away.
    onAvatarChanged(() => sendAvatarNow()),
    onProportionsChanged(() => sendAvatarNow()),
  ]
  waitForAuth(USERNAME_WAIT_MS).then(() => {
    if (!stopped) connect()
  })
}

// Best-effort save for a closing tab (room.send is fire-and-forget), so the
// debounce window doesn't lose the last few seconds.
export function flushProgress() {
  if (getStableUserId() && progressLoaded) sendProgressNow()
}

export function teardown() {
  stopped = true
  started = false
  clearTimeout(retryTimer)
  clearTimeout(statsTimer)
  clearTimeout(progressTimer)
  retryTimer = statsTimer = progressTimer = 0
  for (const off of offs) off?.()
  offs = []
  clearRemotePlayers()
  // Final best-effort save (room.send is fire-and-forget), but never before the
  // saved doc has loaded, or the starting values would overwrite it.
  if (getStableUserId() && progressLoaded) sendProgressNow()
  if (room) {
    try {
      // Don't let the SDK reconnect a socket we are deliberately closing.
      if (room.reconnection) room.reconnection.enabled = false
      room.leave()
    } catch {
      /* page is going away */
    }
  }
  room = null
  if (stealing) onStealResult({ ok: false, reason: 'gone' })
  setServerBuy(null)
  shopOffline()
  connecting = false
  netState.playerCount = 0
  setStatus('idle')
}
