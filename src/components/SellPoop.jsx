import { useEffect, useSyncExternalStore } from 'react'
import { SELL_RATE, getPoopStacks, sellInventory, subscribeInventory } from '../systems/poop.js'
import { closeSell, getSellOpen, subscribeSell } from '../systems/sellPanel.js'
import { GuideArrow, useSellGuide } from './Tutorial.jsx'
import { showActionResult } from '../systems/actionResult.js'

const formatLb = (v) => `${Number.isInteger(v) ? v : v.toFixed(1)} lb`
const formatMoney = (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Sell Poop modal, opened by holding E at the Sell stall. Shows what the selected poop
// and the whole inventory are worth, and sells whichever the player picks.
export default function SellPoop() {
  const open = useSyncExternalStore(subscribeSell, getSellOpen)
  const { stacks, selected } = useSyncExternalStore(subscribeInventory, getPoopStacks)
  const sellGuide = useSellGuide()

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (!e.repeat && (e.code === 'Escape' || e.code === 'KeyE')) closeSell()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  const stack = stacks.find((s) => s.key === selected)
  const totalLb = stacks.reduce((n, s) => n + s.value, 0)

  const sell = (all) => {
    const earned = sellInventory(all)
    if (earned > 0) showActionResult(`Sold for ${formatMoney(earned)}`, true)
    else showActionResult('Nothing to sell', false)
    closeSell()
  }

  return (
    <div className="shop-overlay">
      <div className="shop-stack">
        <div className="shop-panel sell-panel">
          <button className="shop-close" onClick={closeSell} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
          <div className="shop-head">Sell Poop</div>
          <div className="shop-list">
            {stack && (
              <button className="shop-item" onClick={() => sell(false)}>
                <span className="shop-icon" style={{ background: stack.color }}>💩</span>
                <span className="shop-info">
                  <span className="shop-name">Sell Selected</span>
                  <span className="shop-stock">{stack.name} · {formatLb(stack.value)}</span>
                  <span className="shop-price">{formatMoney(stack.value * SELL_RATE)}</span>
                </span>
                {sellGuide && <GuideArrow dir="left" />}
              </button>
            )}
            <button className="shop-item" onClick={() => sell(true)} disabled={!stacks.length}>
              <span className="shop-icon">🧺</span>
              <span className="shop-info">
                <span className="shop-name">Sell Whole Inventory</span>
                <span className="shop-stock">{stacks.length} poop{stacks.length === 1 ? '' : 's'} · {formatLb(totalLb)}</span>
                {stacks.length ? (
                  <span className="shop-price">{formatMoney(totalLb * SELL_RATE)}</span>
                ) : (
                  <span className="shop-price shop-nostock">NOTHING TO SELL</span>
                )}
              </span>
            </button>
            {!stack && stacks.length > 0 && (
              <div className="shop-warning">Select your new poop in the inventory bar below to sell just that one</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
