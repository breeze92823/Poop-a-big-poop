import { useEffect, useSyncExternalStore } from 'react'
import { SAVE_COST, SAVE_HOURS, closeFoodFx, getFoodFx, saveFoods, subscribeFoodFx } from '../systems/foodFx.js'
import { FOODS } from '../systems/shop.js'

const formatLeft = (s) => `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`

function FoodTiles({ slots, note }) {
  return (
    <div className="fx-tiles">
      {slots.map(({ id, count }) => {
        const food = FOODS.find((f) => f.id === id)
        if (!food) return null
        return (
          <div key={id} className="fx-tile" tabIndex={0}>
            <span className="fx-tile-icon">{food.icon}</span>
            <span className="fx-tile-name">{food.effect}</span>
            {count > 1 && <span className="fx-tile-count">x{count}</span>}
            <div className="fx-tip" role="tooltip">
              <div className="fx-tip-head">
                <span className="fx-tip-icon">{food.icon}</span>
                <div className="fx-tip-title">
                  <span className="fx-tip-effect">{food.effect}</span>
                  <span className={`fx-tip-type fx-tip-${food.type.toLowerCase()}`}>{food.type} Mutation</span>
                </div>
              </div>
              <span className="fx-tip-food">{food.name}</span>
              <span className="fx-tip-line">{food.mult}X Poop {food.stat === 'SIZE' ? 'Size' : 'Value'}</span>
              <span className="fx-tip-line">Makes Poops {food.effect}</span>
              <span className="fx-tip-note">{note}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Save Food Effects modal, opened by holding E at the Save Food Effect stall
// (systems/interact.js). Pays to keep the held foods for 24 hours; Escape/E/X closes.
export default function SaveFoodFx() {
  const { open, saved, secondsLeft, pending, canSave } = useSyncExternalStore(subscribeFoodFx, getFoodFx)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (!e.repeat && (e.code === 'Escape' || e.code === 'KeyE')) closeFoodFx()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <div className="shop-overlay">
      <div className="shop-stack">
        <div className="shop-panel fx-panel">
          <button className="shop-close" onClick={closeFoodFx} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
          <div className="shop-head fx-head">
            <span className="fx-title">Save Mutations</span>
            <span className="fx-sub">Keep your food effects for {SAVE_HOURS} hours</span>
          </div>

          <div className="fx-body">
            <section className="fx-section">
              <div className="fx-row">
                <span className="fx-heading fx-green">Saved Mutations</span>
                <span className="fx-status fx-green">{saved.length ? `Expires in ${formatLeft(secondsLeft)}` : 'No active save'}</span>
              </div>
              {saved.length ? <FoodTiles slots={saved} note={`Expires in ${formatLeft(secondsLeft)}`} /> : <div className="fx-empty">No saved mutations yet</div>}
            </section>

            <section className="fx-section">
              <div className="fx-row">
                <span className="fx-heading fx-gold">Set To Expire</span>
                <span className="fx-status fx-gold">Expires After You Leave Server</span>
              </div>
              {pending.length ? <FoodTiles slots={pending} note="Expires when you leave" /> : <div className="fx-empty fx-empty-sm">Nothing waiting to be saved</div>}
            </section>

            <div className="fx-note">Expires in {SAVE_HOURS} hours • Re-save to reset timer</div>
            <button className="fx-save" onClick={saveFoods} disabled={!canSave}>
              Save All <i aria-hidden>•</i> ${SAVE_COST}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
