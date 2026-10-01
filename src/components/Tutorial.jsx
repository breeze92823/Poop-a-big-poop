import { useSyncExternalStore } from 'react'
import { BOOST_MINUTES } from '../systems/boost.js'
import { CHARGING_COPY, RETRY_COPY } from '../data/tutorial.js'
import { getTutorial, subscribeTutorial } from '../systems/tutorial.js'
import { getSellOpen, subscribeSell } from '../systems/sellPanel.js'
import { getShop, subscribeShop } from '../systems/shop.js'
import { getBoost, subscribeBoost } from '../systems/boost.js'

// Red arrow beside the vertical charge bar, shown by Hud.jsx while the bar is up and the
// tutorial is still on the first (hold) step.
export function ChargeArrow() {
  const t = useSyncExternalStore(subscribeTutorial, getTutorial)
  if (!t.visible || t.step?.id !== 'hold') return null
  return (
    <svg className="tutorial-arrow" viewBox="0 0 64 40" aria-hidden>
      <path d="M2 12h34V2l26 18-26 18V28H2z" />
    </svg>
  )
}

// True while the tutorial's sell step is on and the Sell window is open: FoodBar.jsx then
// points at the newest poop, and SellPoop.jsx at "Sell Selected" once it is picked.
export function useSellGuide() {
  const t = useSyncExternalStore(subscribeTutorial, getTutorial)
  const sellOpen = useSyncExternalStore(subscribeSell, getSellOpen)
  return t.visible && t.step?.id === 'sell' && sellOpen
}

// True on the tutorial's eat step: FoodBar.jsx points at the bought food until it is selected.
export function useEatGuide() {
  const t = useSyncExternalStore(subscribeTutorial, getTutorial)
  return t.visible && t.step?.id === 'eat'
}

// True while the tutorial's buy step is on and the Food Shop is open: FoodShop.jsx then
// points at the first food's rarity button and shows its discount.
export function useBuyGuide() {
  const t = useSyncExternalStore(subscribeTutorial, getTutorial)
  const { open } = useSyncExternalStore(subscribeShop, getShop)
  return t.visible && t.step?.id === 'buy' && open
}

// True while the tutorial's boost step is on and the Size Boost window is open: SizeBoost.jsx
// then points at Claim.
export function useBoostGuide() {
  const t = useSyncExternalStore(subscribeTutorial, getTutorial)
  const { open } = useSyncExternalStore(subscribeBoost, getBoost)
  return t.visible && t.step?.id === 'boost' && open
}

// Red arrow bobbing toward `dir` ('down' over a hotbar card, 'left' inside a button, 'right' beside one).
const ARROW_PATH = {
  down: 'M44 2v16h10L32 38 10 18h10V2z',
  left: 'M62 12H28V2L2 20l26 18V28h34z',
  right: 'M2 12h34V2l26 18-26 18V28H2z',
}

export function GuideArrow({ dir }) {
  return (
    <svg className={`guide-arrow guide-arrow-${dir}`} viewBox="0 0 64 40" aria-hidden>
      <path d={ARROW_PATH[dir]} />
    </svg>
  )
}

// A hint is a string, or an array of strings and { text, color } runs (data/tutorial.js).
function Hint({ hint }) {
  if (!Array.isArray(hint)) return hint
  return hint.map((run, i) =>
    typeof run === 'string' ? run : (
      <span key={i} style={{ color: run.color }}>
        {run.text}
      </span>
    ),
  )
}

// Top-centre tutorial banner on its storm-cloud blob: the current step's title and hint, or "Tutorial Complete"
// for a few seconds at the end.
// Renders nothing once finished, while a signed-in player's saved flag is still loading,
// or in a build with the tutorial disabled (VITE_NO_TUTORIAL).
export default function Tutorial({ phase = 'idle' }) {
  const t = useSyncExternalStore(subscribeTutorial, getTutorial)
  if (!t.visible) return null
  // The Hud's phase picks the coaching: release while the charge bar is up, and a retry
  // prompt on the meter step once a missed tap has hidden the meter.
  const id = t.step?.id
  const copy =
    id === 'hold' && phase === 'charging' ? CHARGING_COPY : id === 'poop' && phase === 'idle' ? RETRY_COPY : null
  const title = t.celebrating
    ? t.notice
      ? `Create poop now! The Size Boost only works for ${BOOST_MINUTES} minutes`
      : 'Tutorial Complete!' : copy ? copy.title : `Tutorial: ${t.step.title}`
  const hint = copy ? copy.hint : t.step?.hint
  return (
    <div className={copy === CHARGING_COPY ? 'hud-banner is-long' : 'hud-banner'}>
      <span style={t.notice ? { color: '#ff3b30' } : undefined}>{title}</span>
      {!t.celebrating && hint && (
        <small className="hud-banner-hint">
          <Hint hint={hint} />
        </small>
      )}
    </div>
  )
}
