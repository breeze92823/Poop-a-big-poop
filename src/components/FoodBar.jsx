import { useEffect, useSyncExternalStore } from 'react'
import { FOODS } from '../systems/shop.js'
import { getPoopStacks, poopScale, subscribeInventory, toggleStack } from '../systems/poop.js'
import { getPantry, selectSlot, subscribePantry, toggleSelect } from '../systems/pantry.js'

const formatLb = (v) => `${Number.isInteger(v) ? v : v.toFixed(1)} lb`

// Bottom-centre hotbar of bought foods: one card per food, count top-left, name
// below. Click/tap or press its slot number (1-9) to select.
export default function FoodBar() {
  const { slots, selected } = useSyncExternalStore(subscribePantry, getPantry)
  const { stacks, selected: poopSel } = useSyncExternalStore(subscribeInventory, getPoopStacks)

  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat || !/^Digit[1-9]$/.test(e.code)) return
      selectSlot(Number(e.code.slice(5)) - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!slots.length && !stacks.length) return null
  return (
    <div className="foodbar">
      {slots.map((s) => {
        const food = FOODS.find((f) => f.id === s.id)
        return (
          <button
            key={s.id}
            className={`foodbar-card${selected === s.id ? ' is-selected' : ''}`}
            onClick={() => toggleSelect(s.id)}
          >
            <span className="foodbar-count">{s.count}</span>
            <span className="foodbar-icon" aria-hidden>{food.icon}</span>
            <span className="foodbar-name">{food.name}</span>
          </button>
        )
      })}
      {stacks.map((p) => (
        <button
          key={p.key}
          className={`foodbar-card foodbar-poop${poopSel === p.key ? ' is-selected' : ''}`}
          style={{ '--poop': p.color }}
          title="Selected poop is what the Sell Stall buys"
          onClick={() => toggleStack(p.key)}
        >
          <span className="foodbar-count">{formatLb(p.value)}</span>
          <span className="foodbar-icon" aria-hidden style={{ fontSize: `${Math.min(44, Math.round(26 * poopScale(p.value)))}px` }}>💩</span>
          <span className="foodbar-name">{p.name}</span>
        </button>
      ))}
    </div>
  )
}
