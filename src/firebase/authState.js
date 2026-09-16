// Anonymous sign-in happens once at boot, away from any screen. When it fails
// the whole app is stuck with no uid — every "create" and "join" button waits
// forever on a session that is never coming. This carries the reason from that
// boot-time call to the UI so the failure is visible instead of silent.

let authError = null
const subscribers = new Set()

/** Record why the app has no session. Accepts a Firebase error or a plain code. */
export function reportAuthError(e) {
  authError = e?.code || e?.message || String(e)
  for (const cb of subscribers) cb(authError)
}

/** Subscribe to the failure reason. Fires immediately with the current value. */
export function subscribeAuthError(cb) {
  subscribers.add(cb)
  cb(authError)
  return () => subscribers.delete(cb)
}
