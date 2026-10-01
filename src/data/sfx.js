// Sound-effect tunables for the E interaction (systems/sfx.js). Every gain is
// 0..1 and multiplies on top of the portal's master volume bus (systems/audio.js).

// Success "pop" for a completed hold-E action (systems/interact.js) — a real
// file served from /public/audio. Until it loads, sfx.js fails quietly and the
// game just stays silent here.
export const POP_SOUND_URL = '/audio/power_gain.mp3'
export const POP_GAIN = 0.135

// Played when a poop drops (systems/poop.js awardPoop).
export const FART_SOUND_URL = '/audio/fart.mp3'
export const FART_GAIN = 0.16
// Other players' farts fade out linearly (squared, so it falls off quickly) from full
// volume at FART_HEAR_NEAR_M to silence at FART_HEAR_RANGE_M (the island is 52 m across).
export const FART_HEAR_NEAR_M = 2
export const FART_HEAR_RANGE_M = 32

// Blocked hold-E action (systems/actionResult.js, success=false): two short
// descending square-wave notes, rendered once via OfflineAudioContext. Swap in
// a real action_fail.mp3 and delete the synthesis when one exists.
export const ACTION_FAIL_GAIN = 0.14
export const ACTION_FAIL_SYNTH_NOTES_HZ = [220, 164.81] // A3 down to E3
export const ACTION_FAIL_SYNTH_NOTE_GAP_S = 0.09
export const ACTION_FAIL_SYNTH_ATTACK_S = 0.004
export const ACTION_FAIL_SYNTH_DECAY_S = 0.16

// Short UI "tick" for pressing the touch E button: a high sine blip plus a
// filtered noise burst for tactile texture.
export const BUTTON_CLICK_GAIN = 0.075
export const BUTTON_CLICK_SYNTH_FREQ_HZ = 1050
export const BUTTON_CLICK_SYNTH_ATTACK_S = 0.002
export const BUTTON_CLICK_SYNTH_DECAY_S = 0.045
export const BUTTON_CLICK_SYNTH_NOISE_GAIN = 0.22
export const BUTTON_CLICK_SYNTH_NOISE_DECAY_S = 0.02
