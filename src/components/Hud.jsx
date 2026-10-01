import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { settings } from '../systems/settingsState.js'
import { useSettings } from '../systems/bloxityHooks.js'
import { login, subscribeAuth } from '../systems/bloxity.js'
import { player } from '../systems/playerState.js'
import InteractPrompt from './InteractPrompt.jsx'
import ActionResult from './ActionResult.jsx'
import FoodShop from './FoodShop.jsx'
import SellPoop from './SellPoop.jsx'
import SizeBoost from './SizeBoost.jsx'
import SaveFoodFx from './SaveFoodFx.jsx'
import FoodBar from './FoodBar.jsx'
import Tutorial, { ChargeArrow } from './Tutorial.jsx'
import { reportTutorialEvent } from '../systems/tutorial.js'
import { FOODS } from '../systems/shop.js'
import { consumeSelected, getPantry } from '../systems/pantry.js'
import { showActionResult } from '../systems/actionResult.js'
import { MAX_POOPS, awardPoop, isInventoryFull, getSelectedPoopType, getMoney, subscribeMoney } from '../systems/poop.js'

function FpsMeter() {
  const [fps, setFps] = useState(0)
  const frames = useRef(0)
  useEffect(() => {
    let raf
    let last = performance.now()
    const tick = (now) => {
      frames.current += 1
      if (now - last >= 500) {
        setFps(Math.round((frames.current * 1000) / (now - last)))
        frames.current = 0
        last = now
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <div className="hud-fps">{fps} FPS</div>
}

const CHARGE_PERIOD = 1200 // ms for the bar to fill (then drain) once
const NEEDLE_PERIOD = 1600 // ms for the needle to sweep across and back
const REWARD_MAX = 100 // poop stored for a full-power (100%) charge bar

// Timing meter geometry, as % of the meter box. The green zone (and the red centre inside it, at
// SWEET_AT / SWEET_W of the zone) is re-rolled at random: size and position both change.
const NEEDLE_MIN = 4
const NEEDLE_MAX = 96
const ZONE_W_MIN = 10
const ZONE_W_MAX = 24
const SWEET_AT = 0.47 // red centre's left edge, fraction of the zone width (mirrors .hud-meter-sweet)
const SWEET_W = 0.045 // red centre's width, fraction of the zone width
const FAST_CHANCE = 0.35 // chance a corner-to-corner sweep runs at double speed
const TURBO_CHANCE = 0.3 // chance a fast sweep doubles again (4x)

function randomZone() {
  const w = ZONE_W_MIN + Math.random() * (ZONE_W_MAX - ZONE_W_MIN)
  const l = NEEDLE_MIN + Math.random() * (NEEDLE_MAX - NEEDLE_MIN - w)
  return { l, w }
}

// Progress gained (0..1 of the bar) for a needle landing at `pos` (%): red is best, green scales with
// closeness to the red, anywhere else is a miss.
function hitGain(pos, { l, w }) {
  const zoneR = l + w
  const redL = l + w * SWEET_AT
  const redR = redL + w * SWEET_W
  if (pos >= redL && pos <= redR) return 0.4
  if (pos < l || pos > zoneR) return 0
  const edge = pos < redL ? redL - l : zoneR - redR
  const dist = pos < redL ? redL - pos : pos - redR
  return 0.1 + 0.2 * (1 - dist / edge)
}

// Vertical charge bar: ping-pongs 0..1 while mounted and reports the live value through valueRef.
function ChargeBar({ valueRef }) {
  const fill = useRef(null)
  useEffect(() => {
    let raf
    const t0 = performance.now()
    const tick = (now) => {
      const p = (((now - t0) / CHARGE_PERIOD) % 2)
      const v = p < 1 ? p : 2 - p
      valueRef.current = v
      if (fill.current) fill.current.style.transform = `scaleY(${v})`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [valueRef])
  return (
    <div className="hud-vbar" aria-hidden>
      <div className="hud-vbar-fill" ref={fill} />
    </div>
  )
}

// Shown only to signed-out players (guests); hidden once signed in, and until
// the first auth state arrives so it doesn't flash for a signed-in player.
function LoginButton() {
  const [signedOut, setSignedOut] = useState(false)
  useEffect(() => subscribeAuth((s) => setSignedOut(s.ready && !s.user)), [])
  if (!signedOut) return null
  return (
    <button type="button" className="hud-login" onClick={login}>
      Bloxity Login
    </button>
  )
}

const POOP_HOLD_MS = 1800 // how long the player stays bent after a poop drops

function useMoney() {
  return useSyncExternalStore(subscribeMoney, getMoney)
}

// DOM overlay laid out like the reference: the tutorial banner (Tutorial.jsx) floating on a dark cloud
// at the top centre and the cash counter bottom-left. Everything is
// pointer-events:none except the buttons, so taps reach the canvas.
export default function Hud() {
  useSettings()
  const money = useMoney()
  // 'idle' (both hidden) -> 'charging' (left button held: vertical bar) -> 'meter' (released: timing meter)
  const [phase, setPhase] = useState('idle')
  const [charge, setCharge] = useState(0) // bar fill (0..1) captured on release
  const [progress, setProgress] = useState(0) // 0..1; reaching 1 pays out charge * REWARD_MAX
  const live = useRef(0)
  const chargeId = useRef(null) // pointer that started the charge, so another finger can't end it
  const dropped = useRef(false) // a poop just dropped: hold the bend a moment after the meter closes
  const needle = useRef(null)
  const needlePos = useRef(0) // live needle position, % of the meter box
  const [zone, setZone] = useState(randomZone)
  const st = useRef({ phase: 'idle', charge: 0, progress: 0, zone })
  st.current.zone = zone
  st.current.phase = phase
  st.current.charge = charge
  st.current.progress = progress

  // Needle sweep, driven from JS so a click can read exactly where it is.
  useEffect(() => {
    if (phase !== 'meter') return
    let raf
    // `ph` counts half-sweeps (corner to corner); each one randomly runs at double speed.
    let ph = 0
    let speed = 1
    let last = performance.now()
    const tick = (now) => {
      const prev = ph
      ph += ((now - last) / NEEDLE_PERIOD) * speed
      last = now
      if (Math.floor(ph) !== Math.floor(prev)) speed = Math.random() < FAST_CHANCE ? (Math.random() < TURBO_CHANCE ? 4 : 2) : 1
      const p = ph % 2
      const v = p < 1 ? p : 2 - p
      needlePos.current = NEEDLE_MIN + (NEEDLE_MAX - NEEDLE_MIN) * v
      if (needle.current) needle.current.style.left = `${needlePos.current}%`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  useEffect(() => {
    if (phase === 'meter') reportTutorialEvent('hold')
  }, [phase])

  // The character bends over while the charge bar or timing meter is showing.
  // After a poop drops it stays bent for POOP_HOLD_MS so the particles play out before standing up.
  useEffect(() => {
    if (phase !== 'idle') {
      player.bending = true
      return
    }
    const t = setTimeout(() => {
      player.bending = false
    }, dropped.current ? POOP_HOLD_MS : 0)
    dropped.current = false
    return () => clearTimeout(t)
  }, [phase])
  useEffect(
    () => () => {
      player.bending = false
    },
    [],
  )

  useEffect(() => {
    const down = (e) => {
      if (e.button !== 0 || e.target.closest('button:not(.touch-btn-big), .shop-overlay')) return
      // Touch: the stick never counts, and in idle the look area doesn't start a charge either
      // (the POOP button does); once the meter is up a tap on the look area lands the needle.
      if (e.target.closest('.touch-stick-zone')) return
      const s = st.current
      if (s.phase === 'idle' && e.target.closest('.touch-look')) return
      if (s.phase === 'idle') {
        chargeId.current = e.pointerId
        // A selected food is eaten into the poop, so it frees its own slot.
        if (isInventoryFull() && !getPantry().selected) {
          showActionResult(`Inventory full (${MAX_POOPS}/${MAX_POOPS}) · sell some poop`, false)
          return
        }
        setPhase('charging')
      } else if (s.phase === 'meter') {
        // Land the needle: red/green fills the progress bar, a miss hides the meter.
        const gain = hitGain(needlePos.current, s.zone)
        if (gain === 0) {
          setProgress(0)
          setPhase('idle')
          return
        }
        const next = Math.min(1, s.progress + gain)
        if (next >= 1) {
          // A selected hotbar food is eaten and wins; otherwise a selected poop passes on its type.
          const id = consumeSelected() ?? getSelectedPoopType()
          awardPoop(Math.round(s.charge * REWARD_MAX), FOODS.find((f) => f.id === id))
          dropped.current = true
          setProgress(0)
          setPhase('idle')
        } else {
          setProgress(next)
          setZone(randomZone())
        }
      }
    }
    const up = (e) => {
      if (e.button !== 0 || st.current.phase !== 'charging' || e.pointerId !== chargeId.current) return
      setCharge(live.current)
      setZone(randomZone())
      setPhase('meter')
    }
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [])
  return (
    <div className="hud" style={{ '--hud-alpha': settings.background_transparency }}>
      {settings.show_fps && <FpsMeter />}
      <LoginButton />

      <InteractPrompt />
      <ActionResult />
      <FoodShop />
      <SellPoop />
      <SizeBoost />
      <SaveFoodFx />
      <FoodBar />

      <Tutorial phase={phase} />

      {phase === 'meter' && (
      <div className="hud-meter" data-charge={charge.toFixed(2)}>
        <div className="hud-meter-box">
          <div className="hud-meter-zone" style={{ left: `${zone.l}%`, width: `${zone.w}%` }}>
            <div className="hud-meter-sweet" />
          </div>
          <div className="hud-meter-needle" ref={needle}>
            <i className="hud-meter-poop" aria-hidden>💩</i>
          </div>
        </div>
        <div className="hud-meter-progress">
          <div className="hud-meter-progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
      )}

      {phase === 'charging' && <ChargeBar valueRef={live} />}
      {phase === 'charging' && <ChargeArrow />}

      <div className="hud-money" key={money}>
        ${money.toFixed(2)}
      </div>
    </div>
  )
}
