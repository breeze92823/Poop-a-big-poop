import { create } from 'zustand'

// Lightweight, infrequently-changing game state for the HUD. Per-frame state
// (the player) lives in systems/playerState.js instead.
export const useGameStore = create(() => ({
  avatarLoaded: false, // player character (incl. Bloxity accessories) finished loading; gates the loading screen
}))
