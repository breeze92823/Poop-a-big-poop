import { playActionFail, playPop } from './sfx.js'

// Trigger for the top-centre ActionResult popup (components/ActionResult.jsx)
// — a framework-free singleton, since the calls come from systems code far
// outside React. `id` increments on every call so the popup's poll can detect
// a fresh trigger even when back-to-back messages share the same text.
export const actionResultState = {
  text: '',
  success: true,
  id: 0,
}

// Success plays the pop, failure the buzz — the sound lands on the same frame
// the popup is flagged.
export function showActionResult(text, success) {
  actionResultState.text = text
  actionResultState.success = success
  actionResultState.id++
  if (success) playPop()
  else playActionFail()
}
