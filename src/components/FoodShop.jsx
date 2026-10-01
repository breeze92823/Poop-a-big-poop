import { useEffect, useSyncExternalStore } from 'react'
import { FOODS, buyFood, closeShop, getShop, subscribeShop } from '../systems/shop.js'

function formatTime(s) {
  const m = Math.floor(s / 60)
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`
}

// Buy Food modal, opened by holding E at the Buy stall (systems/interact.js).
// Clicking a food card buys it; Escape or the red X closes.
export default function FoodShop() {
  const { open, stock, seconds } = useSyncExternalStore(subscribeShop, getShop)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (!e.repeat && (e.code === 'Escape' || e.code === 'KeyE')) closeShop()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null
  return (
    <div className="shop-overlay">
      <div className="shop-stack">
      <div className="shop-warning">Food &amp; their effects expire when you leave the server</div>
      <div className="shop-panel">
        <button className="shop-close" onClick={closeShop} aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        </button>
        <div className="shop-head">New foods in {formatTime(seconds)}</div>
        <div className="shop-list">
          {FOODS.map((f) => (
            <button key={f.id} className="shop-item" onClick={() => buyFood(f.id)} disabled={stock[f.id] <= 0}>
              <span className="shop-icon">{f.icon}</span>
              <span className="shop-info">
                <span className="shop-name">{f.name}</span>
                <span className="shop-stock">X{stock[f.id]} Stock</span>
                {f.price == null || stock[f.id] <= 0 ? (
                  <span className="shop-price shop-nostock">NO STOCK</span>
                ) : (
                  <span className="shop-price">${f.price.toLocaleString('en-US')}</span>
                )}
              </span>
              <span className="shop-effect">
                <span className="shop-mult">{f.mult}X POOP {f.stat}</span>
                <span>Makes Poops {f.effect}</span>
                <span className={`shop-mut shop-mut-${f.type.toLowerCase()}`}>{f.type} Mutation</span>
                <span className={`shop-rarity shop-rarity-${f.rarity.toLowerCase()}`}>{f.rarity}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      </div>
    </div>
  )
}
