import { useSyncExternalStore } from 'react'
import { getUpdate, subscribeUpdate } from '../systems/updateNotice.js'

// Full-width banner shown while the page is about to reload onto a new version
// (systems/updateNotice.js), or asking for a manual refresh if auto-reload already ran.
export default function UpdateNotice() {
  const u = useSyncExternalStore(subscribeUpdate, getUpdate)
  if (!u.active) return null
  return (
    <div className="update-notice" role="alert">
      <b>New version available</b>
      <span>{u.manual ? 'Please refresh the page to update.' : `Saving your progress and reloading in ${u.seconds}s…`}</span>
    </div>
  )
}
