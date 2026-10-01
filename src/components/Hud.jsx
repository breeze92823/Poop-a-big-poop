import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { settings } from '../systems/settingsState.js'
import { useSettings } from '../systems/bloxityHooks.js'
import InteractPrompt from './InteractPrompt.jsx'
import ActionResult from './ActionResult.jsx'
import FoodShop from './FoodShop.jsx'
import SellPoop from './SellPoop.jsx'
import SizeBoost from './SizeBoost.jsx'
import SaveFoodFx from './SaveFoodFx.jsx'
import FoodBar from './FoodBar.jsx'
import { FOODS } from '../systems/shop.js'
import { consumeSelected } from '../systems/pantry.js'
import { awardPoop, getSelectedPoopType, getInventory, getMoney, subscribeInventory, subscribeMoney } from '../systems/poop.js'

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

// Timing meter geometry, as % of the meter box (mirrors .hud-meter-zone / -sweet in index.css).
const NEEDLE_MIN = 4
const NEEDLE_MAX = 96
const ZONE_L = 33
const ZONE_R = 73
const RED_L = 51.8
const RED_R = 53.6

// Progress gained (0..1 of the bar) for a needle landing at `pos` (%): red is best, green scales with
// closeness to the red, anywhere else is a miss.
function hitGain(pos) {
  if (pos >= RED_L && pos <= RED_R) return 0.4
  if (pos < ZONE_L || pos > ZONE_R) return 0
  const edge = pos < RED_L ? RED_L - ZONE_L : ZONE_R - RED_R
  const dist = pos < RED_L ? RED_L - pos : pos - RED_R
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

function useMoney() {
  return useSyncExternalStore(subscribeMoney, getMoney)
}

// DOM overlay laid out like the reference: the tutorial banner floating on a dark cloud
// at the top centre and the cash counter bottom-left. Everything is
// pointer-events:none except the buttons, so taps reach the canvas.
export default function Hud() {
  useSettings()
  const money = useMoney()
  const stock = useSyncExternalStore(subscribeInventory, getInventory)
  // 'idle' (both hidden) -> 'charging' (left button held: vertical bar) -> 'meter' (released: timing meter)
  const [phase, setPhase] = useState('idle')
  const [charge, setCharge] = useState(0) // bar fill (0..1) captured on release
  const [progress, setProgress] = useState(0) // 0..1; reaching 1 pays out charge * REWARD_MAX
  const live = useRef(0)
  const needle = useRef(null)
  const needlePos = useRef(0) // live needle position, % of the meter box
  const st = useRef({ phase: 'idle', charge: 0, progress: 0 })
  st.current.phase = phase
  st.current.charge = charge
  st.current.progress = progress

  // Needle sweep, driven from JS so a click can read exactly where it is.
  useEffect(() => {
    if (phase !== 'meter') return
    let raf
    const t0 = performance.now()
    const tick = (now) => {
      const p = ((now - t0) / NEEDLE_PERIOD) % 2
      const v = p < 1 ? p : 2 - p
      needlePos.current = NEEDLE_MIN + (NEEDLE_MAX - NEEDLE_MIN) * v
      if (needle.current) needle.current.style.left = `${needlePos.current}%`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  useEffect(() => {
    const down = (e) => {
      if (e.button !== 0 || e.target.closest('button, .shop-overlay')) return
      const s = st.current
      if (s.phase === 'idle') {
        setPhase('charging')
      } else if (s.phase === 'meter') {
        // Land the needle: red/green fills the progress bar, a miss hides the meter.
        const gain = hitGain(needlePos.current)
        if (gain === 0) {
          setPhase('idle')
          return
        }
        const next = Math.min(1, s.progress + gain)
        if (next >= 1) {
          // A selected hotbar food is eaten and wins; otherwise a selected poop passes on its type.
          const id = consumeSelected() ?? getSelectedPoopType()
          awardPoop(Math.round(s.charge * REWARD_MAX), FOODS.find((f) => f.id === id))
          setProgress(0)
          setPhase('idle')
        } else {
          setProgress(next)
        }
      }
    }
    const up = (e) => {
      if (e.button !== 0 || st.current.phase !== 'charging') return
      setCharge(live.current)
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

      <InteractPrompt />
      <ActionResult />
      <FoodShop />
      <SellPoop />
      <SizeBoost />
      <SaveFoodFx />
      <FoodBar />

      <div className="hud-banner">
        <span>Tutorial: Tap To Poop</span> <i aria-hidden>💩</i>
      </div>

      {phase === 'meter' && (
      <div className="hud-meter" data-charge={charge.toFixed(2)}>
        <div className="hud-meter-box">
          <div className="hud-meter-zone">
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

      <div className="hud-stock" key={`s${stock}`}>
        <i aria-hidden>💩</i> {Number.isInteger(stock) ? stock : stock.toFixed(1)} lb
      </div>

      <div className="hud-money" key={money}>
        ${money.toFixed(2)}
      </div>
    </div>
  )
}
