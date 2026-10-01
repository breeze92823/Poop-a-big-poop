import { INTERACTS } from './world.js'

// First-run tutorial tunables. systems/tutorial.js reads this; the banner copy lives
// here so it can be reworded without touching the logic.

// Build-time switch (see .env.example): VITE_NO_TUTORIAL=true removes the tutorial
// entirely — no banner, no skip button, nothing saved.
export const TUTORIAL_ENABLED = import.meta.env.VITE_NO_TUTORIAL !== 'true'

// How long the red size-boost reminder stays up before "Tutorial Complete".
export const BOOST_NOTICE_MS = 5000

// How long the "Tutorial Complete" banner stays up.
export const COMPLETE_MS = 4000

// Cheapest food that is on the shelf at every restock (systems/shop.js), named in the buy step.
export const FIRST_FOOD = { name: 'Lettuce', price: 20 }

// Where components/GuideArrows.jsx leads the player for a step: the stall's Press-E zone
// centre, and `y`, the height the big arrow bobs at above it.
const zone = (id) => INTERACTS.find((z) => z.id === id)
const target = (id, y) => ({ x: zone(id).x, z: zone(id).z, y })

// A hint is a string, or an array of strings and { text, color } runs for coloured words.
// Blue is lightened so it reads on the dark cloud behind the banner.
const BLUE = '#4aa8ff'
const YELLOW = '#ffd23a'

// Replaces the 'hold' step's banner while the player is holding the mouse and the charge bar is up.
export const CHARGING_COPY = {
  title: 'Keep holding, and release the mouse when the progress bar reaches its highest percentage',
  hint: 'Releasing at the highest percentage maximizes the weight of the poop you produce',
}

// The 'poop' step's banner when the meter is gone (a missed tap) and the player must charge again.
export const RETRY_COPY = {
  title: 'Click and hold the left mouse button to try again',
  hint: '',
}

// One entry per step, in order; an optional `target` {x, z, y} gets the red guide arrows. `id` is the event systems/tutorial.js waits for:
//   hold  — the charge bar was released and the timing meter appeared (Hud.jsx reports it)
//   poop  — any poop dropped (the meter's progress bar filled)
//   sell  — lifetime earnings grew (poop sold at the Sell Stall)
//   buy   — a food was added to the pantry (bought at the Buy Stall)
//   eat   — a poop dropped with a food selected (its type is not 'plain')
//   boost — the Day 1 Daily Size Boost was claimed at the Boost Stall (or already had been today)
export const TUTORIAL_STEPS = [
  { id: 'hold', title: 'Click and hold the left mouse button', hint: '' },
  {
    id: 'poop',
    title: 'Click when the needle is inside the green zone',
    hint: 'Land on the red line for the biggest gain, and fill the progress bar to drop your poop',
  },
  { id: 'sell', title: 'Sell Your Poop', hint: ['Walk to the ', { text: 'Sell Stall', color: BLUE }, ' and hold E'], target: target('sell', 3.4) },
  {
    id: 'buy',
    title: 'Buy A Food',
    target: target('buy', 3.4),
    hint: `Shop for ${FIRST_FOOD.name} at the Shop Stall`,
  },
  { id: 'eat', title: 'Poop With Food', hint: 'Pick the food in the bar at the bottom, then poop for a bigger payout' },
  {
    id: 'boost',
    title: 'Claim Your Daily Boost',
    target: target('boost', 3.4),
    hint: ['Walk to the ', { text: 'Boost Stall', color: YELLOW }, ' and claim your Day 1 Size Boost'],
  },
]
