import { useEffect, useRef } from 'react'

// Holds a screen wake lock while the timer is running, so the phone can sit on
// the desk showing the clock instead of dimming out after thirty seconds. The
// lock is dropped as soon as the timer pauses, and the browser drops it by
// itself whenever the page is hidden — hence the re-request on visibilitychange.
//
// Unsupported or refused (older browsers, low battery, no user gesture yet) is
// a normal outcome, not an error: the timer carries on either way.
export default function useWakeLock(active) {
  const lockRef = useRef(null)

  useEffect(() => {
    if (!active) return
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let cancelled = false

    async function acquire() {
      if (lockRef.current || document.visibilityState !== 'visible') return
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) {
          lock.release().catch(() => {})
          return
        }
        lockRef.current = lock
        lock.addEventListener('release', () => { lockRef.current = null })
      } catch {
        // nothing to recover from — the screen just behaves as usual
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      const lock = lockRef.current
      lockRef.current = null
      if (lock) lock.release().catch(() => {})
    }
  }, [active])
}
