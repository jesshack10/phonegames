import { ref, set, remove } from 'firebase/database'
import { db, auth } from '../firebase/config'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

/**
 * Background alarms via Web Push.
 *
 * A suspended page cannot make a sound, so the alarm has to come from outside
 * the phone. When a period starts we write its deadline to the database; a
 * Cloud Function schedules a task for that instant and pushes a notification
 * when it fires. Stopping the period deletes the record, and the task checks
 * the record still matches before sending — so a cancelled period can never
 * ring later.
 */

export function pushSupported() {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(VAPID_PUBLIC_KEY) &&
    Boolean(db)
}

/**
 * iOS only allows push for a PWA opened from the Home Screen — in a Safari
 * tab the APIs exist but subscribing always fails, so it is worth saying so
 * rather than showing an error later.
 */
export function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.navigator.standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true
}

export function isIos() {
  if (typeof navigator === 'undefined') return false
  return /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function permission() {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

function urlBase64ToUint8Array(base64) {
  const padded = (base64 + '='.repeat((4 - base64.length % 4) % 4))
    .replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

let registrationPromise = null

export function ensureRegistration() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null)
  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .catch(e => { console.warn('service worker registration failed', e); return null })
  }
  return registrationPromise
}

/**
 * Ask for permission and subscribe. MUST be called from a user gesture: iOS
 * ignores a permission request that is not tied to a tap.
 * Resolves to { ok } or { ok: false, reason }.
 */
export async function enable() {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' }
  if (isIos() && !isStandalone()) return { ok: false, reason: 'needs-home-screen' }

  try {
    const granted = await Notification.requestPermission()
    if (granted !== 'granted') return { ok: false, reason: granted === 'denied' ? 'denied' : 'dismissed' }

    const registration = await ensureRegistration()
    if (!registration) return { ok: false, reason: 'no-service-worker' }
    await navigator.serviceWorker.ready

    const existing = await registration.pushManager.getSubscription()
    const subscription = existing || await registration.pushManager.subscribe({
      userVisibleOnly: true,   // required, and iOS enforces it
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    saveSubscription(subscription)
    return { ok: true }
  } catch (e) {
    console.warn('push subscribe failed', e)
    return { ok: false, reason: 'failed' }
  }
}

export async function disable() {
  try {
    await cancelAlarm()
    const registration = await ensureRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    if (subscription) await subscription.unsubscribe()
  } catch (e) {
    console.warn('push unsubscribe failed', e)
  }
  clearSubscription()
}

// The subscription is kept locally too, so scheduling an alarm needs no
// round-trip to the push service on every block.
const SUB_KEY = 'pomodoro.push.subscription'

function saveSubscription(subscription) {
  try { localStorage.setItem(SUB_KEY, JSON.stringify(subscription.toJSON())) } catch { /* ignore */ }
}

function clearSubscription() {
  try { localStorage.removeItem(SUB_KEY) } catch { /* ignore */ }
}

function readSubscription() {
  try {
    const raw = localStorage.getItem(SUB_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function isEnabled() {
  return permission() === 'granted' && Boolean(readSubscription())
}

function alarmRef() {
  const uid = auth?.currentUser?.uid
  if (!db || !uid) return null
  return ref(db, `pushAlarms/${uid}`)
}

/**
 * Book the alarm for this period. Overwrites any previous one: only the
 * period actually running should be able to ring.
 */
export async function scheduleAlarm({ endsAt, title, body }) {
  if (!isEnabled()) return false
  const target = alarmRef()
  const subscription = readSubscription()
  if (!target || !subscription || !(endsAt > Date.now())) return false
  try {
    await set(target, {
      endsAt,
      title: title || 'Period finished',
      body: body || 'Tap to log what you were doing.',
      subscription,
      createdAt: Date.now(),
    })
    return true
  } catch (e) {
    console.warn('could not book the alarm', e)
    return false
  }
}

/** Pausing, splitting or leaving must call this, or a dead period would ring. */
export async function cancelAlarm() {
  const target = alarmRef()
  if (!target) return
  try { await remove(target) } catch (e) { console.warn('could not cancel the alarm', e) }
}
