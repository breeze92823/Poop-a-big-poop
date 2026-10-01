import { useEffect, useSyncExternalStore } from 'react'
import { BOOST_MINUTES, DAY_MULTS, SKIP_COST, claimBoost, closeBoost, getBoost, skipTimer, subscribeBoost } from '../systems/boost.js'

const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
// 500000 -> 500K, 1500000 -> 1.5M
const formatShort = (n) => (n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}K` : `${n}`)
const formatMult = (m) => `${m}x`

// Daily Size Boost modal, opened by holding E at the Boost stall (systems/interact.js).
// CLAIM starts a timed size multiplier that grows with the daily streak; Escape/E/X closes.
export default function SizeBoost() {
  const { open, streak, canClaim, claimedToday, active, mult, secondsLeft } = useSyncExternalStore(subscribeBoost, getBoost)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (!e.repeat && (e.code === 'Escape' || e.code === 'KeyE')) closeBoost()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <div className="shop-overlay">
      <div className="shop-stack">
        <div className="shop-panel boost-panel">
          <button className="shop-close" onClick={closeBoost} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
          <div className="shop-head boost-head">
            <span>Daily Size Boost</span>
            <button className="boost-skip" onClick={skipTimer} disabled={canClaim}>Skip Timer · ${formatShort(SKIP_COST)}</button>
          </div>

          <div className="boost-body">
            <div className="boost-warn">⚠️ Streak resets if you miss a day ⚠️</div>

            <div className="boost-today">
              <i className="boost-today-icon" aria-hidden>💩</i>
              <div className="boost-today-main">
                <span className="boost-label">Today&apos;s Boost</span>
                <span className="boost-big">{active ? `${formatMult(mult)} Size Boost` : 'No Boost Active'}</span>
              </div>
              <div className="boost-today-side">
                <span className="boost-label">Claimed Today</span>
                <span className="boost-side-val">{active ? formatTime(secondsLeft) : claimedToday ? 'Ended' : 'No'}</span>
              </div>
            </div>

            <div className="boost-title">Your Claim Streak</div>
            <div className="boost-days">
              {DAY_MULTS.map((m, i) => {
                const done = streak >= i + 1
                return (
                  <div key={i} className={`boost-day${done ? ' boost-day-done' : ''}`}>
                    <span className="boost-day-n">Day {i + 1}{i === DAY_MULTS.length - 1 ? '+' : ''}</span>
                    <span className="boost-day-m">{formatMult(m)}</span>
                    {done && (
                      <svg className="boost-check" viewBox="0 0 24 24" aria-hidden>
                        <path d="M3 13l6 6L21 6" />
                      </svg>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="boost-note">Boost lasts {BOOST_MINUTES} minutes • Claim once per day</div>
            <button className="boost-claim" onClick={claimBoost} disabled={!canClaim}>Claim</button>
          </div>
        </div>
      </div>
    </div>
  )
}
