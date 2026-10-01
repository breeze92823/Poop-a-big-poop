// Interaction sound effects, played through audio.js's shared AudioContext/
// master bus so the portal's master_volume setting controls them. The success
// pop is a real file (fetched + decoded once); the fail buzz and button tick
// are synthesized once via OfflineAudioContext and cached the same way.
import { unlock, getMasterBus } from './audio.js'
import {
  POP_SOUND_URL,
  POP_GAIN,
  FART_SOUND_URL,
  FART_GAIN,
  FART_HEAR_NEAR_M,
  FART_HEAR_RANGE_M,
  ACTION_FAIL_GAIN,
  ACTION_FAIL_SYNTH_NOTES_HZ,
  ACTION_FAIL_SYNTH_NOTE_GAP_S,
  ACTION_FAIL_SYNTH_ATTACK_S,
  ACTION_FAIL_SYNTH_DECAY_S,
  BUTTON_CLICK_GAIN,
  BUTTON_CLICK_SYNTH_FREQ_HZ,
  BUTTON_CLICK_SYNTH_ATTACK_S,
  BUTTON_CLICK_SYNTH_DECAY_S,
  BUTTON_CLICK_SYNTH_NOISE_GAIN,
  BUTTON_CLICK_SYNTH_NOISE_DECAY_S,
} from '../data/sfx.js'

const bufferCache = new Map() // url -> Promise<AudioBuffer|null>

function loadBuffer(ctx, url) {
  if (!bufferCache.has(url)) {
    bufferCache.set(
      url,
      fetch(url)
        .then((res) => res.arrayBuffer())
        .then((data) => ctx.decodeAudioData(data))
        .catch((err) => {
          console.warn(`[sfx] failed to load ${url}`, err)
          bufferCache.delete(url)
          return null
        }),
    )
  }
  return bufferCache.get(url)
}

// Warms every decode/render cache so the first interaction doesn't wait.
// Constructing the AudioContext and decoding don't need a user gesture, only
// producing sound does (audio.js's gesture-triggered unlock()).
export function preload() {
  const ctx = unlock()
  if (!ctx) return
  loadBuffer(ctx, POP_SOUND_URL)
  loadBuffer(ctx, FART_SOUND_URL)
  synthesizeActionFailBuffer(ctx)
  synthesizeButtonClickBuffer(ctx)
}

function playBuffer(ctx, buffer, level) {
  if (!buffer) return
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const gain = ctx.createGain()
  gain.gain.value = level
  source.connect(gain)
  gain.connect(getMasterBus())
  source.start(0)
}

// Fire-and-forget: a fresh source node per call so overlapping plays never
// fight each other.
export function playPop() {
  const ctx = unlock()
  if (!ctx) return
  loadBuffer(ctx, POP_SOUND_URL).then((buffer) => playBuffer(ctx, buffer, POP_GAIN))
}

// `distance` (m) is how far away the farter is: omitted for our own, full volume.
export function playFart(distance = 0) {
  const t = (FART_HEAR_RANGE_M - distance) / (FART_HEAR_RANGE_M - FART_HEAR_NEAR_M)
  const falloff = Math.min(1, Math.max(0, t)) ** 2
  if (falloff <= 0.001) return
  const ctx = unlock()
  if (!ctx) return
  loadBuffer(ctx, FART_SOUND_URL).then((buffer) => playBuffer(ctx, buffer, FART_GAIN * falloff))
}

let actionFailBufferPromise = null

function synthesizeActionFailBuffer(ctx) {
  if (!actionFailBufferPromise) {
    const noteS = ACTION_FAIL_SYNTH_ATTACK_S + ACTION_FAIL_SYNTH_DECAY_S
    const totalS = ACTION_FAIL_SYNTH_NOTE_GAP_S * (ACTION_FAIL_SYNTH_NOTES_HZ.length - 1) + noteS + 0.05
    const sampleRate = ctx.sampleRate
    const offline = new OfflineAudioContext(1, Math.ceil(totalS * sampleRate), sampleRate)

    ACTION_FAIL_SYNTH_NOTES_HZ.forEach((freq, i) => {
      const start = i * ACTION_FAIL_SYNTH_NOTE_GAP_S
      const peak = start + ACTION_FAIL_SYNTH_ATTACK_S
      const end = peak + ACTION_FAIL_SYNTH_DECAY_S

      const osc = offline.createOscillator()
      osc.type = 'square'
      osc.frequency.value = freq

      const gain = offline.createGain()
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.7, peak)
      gain.gain.exponentialRampToValueAtTime(0.001, end)

      osc.connect(gain)
      gain.connect(offline.destination)
      osc.start(start)
      osc.stop(end + 0.05)
    })
    actionFailBufferPromise = offline.startRendering()
  }
  return actionFailBufferPromise
}

// Buzz for a blocked hold-E action — called by actionResult.js the same
// instant the red popup shows.
export function playActionFail() {
  const ctx = unlock()
  if (!ctx) return
  synthesizeActionFailBuffer(ctx).then((buffer) => playBuffer(ctx, buffer, ACTION_FAIL_GAIN))
}

let buttonClickBufferPromise = null

function synthesizeButtonClickBuffer(ctx) {
  if (!buttonClickBufferPromise) {
    const toneEnd = BUTTON_CLICK_SYNTH_ATTACK_S + BUTTON_CLICK_SYNTH_DECAY_S
    const totalS = Math.max(toneEnd, BUTTON_CLICK_SYNTH_NOISE_DECAY_S) + 0.02
    const sampleRate = ctx.sampleRate
    const offline = new OfflineAudioContext(1, Math.ceil(totalS * sampleRate), sampleRate)

    const osc = offline.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = BUTTON_CLICK_SYNTH_FREQ_HZ

    const toneGain = offline.createGain()
    toneGain.gain.setValueAtTime(0, 0)
    toneGain.gain.linearRampToValueAtTime(1, BUTTON_CLICK_SYNTH_ATTACK_S)
    toneGain.gain.exponentialRampToValueAtTime(0.001, toneEnd)

    const noiseLength = Math.ceil(BUTTON_CLICK_SYNTH_NOISE_DECAY_S * sampleRate)
    const noiseBuffer = offline.createBuffer(1, noiseLength, sampleRate)
    const noiseData = noiseBuffer.getChannelData(0)
    for (let i = 0; i < noiseLength; i++) noiseData[i] = Math.random() * 2 - 1

    const noiseSource = offline.createBufferSource()
    noiseSource.buffer = noiseBuffer

    const noiseFilter = offline.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = BUTTON_CLICK_SYNTH_FREQ_HZ * 3
    noiseFilter.Q.value = 1.5

    const noiseGain = offline.createGain()
    noiseGain.gain.setValueAtTime(BUTTON_CLICK_SYNTH_NOISE_GAIN, 0)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, BUTTON_CLICK_SYNTH_NOISE_DECAY_S)

    osc.connect(toneGain)
    toneGain.connect(offline.destination)
    noiseSource.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(offline.destination)

    osc.start(0)
    osc.stop(toneEnd + 0.02)
    noiseSource.start(0)

    buttonClickBufferPromise = offline.startRendering()
  }
  return buttonClickBufferPromise
}

export function playButtonClick() {
  const ctx = unlock()
  if (!ctx) return
  synthesizeButtonClickBuffer(ctx).then((buffer) => playBuffer(ctx, buffer, BUTTON_CLICK_GAIN))
}
