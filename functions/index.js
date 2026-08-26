const { onValueWritten } = require('firebase-functions/v2/database')
const { onTaskDispatched } = require('firebase-functions/v2/tasks')
const { defineSecret } = require('firebase-functions/params')
const { initializeApp } = require('firebase-admin/app')
const { getDatabase } = require('firebase-admin/database')
const { getFunctions } = require('firebase-admin/functions')
const logger = require('firebase-functions/logger')
const webpush = require('web-push')

initializeApp()

const VAPID_PUBLIC_KEY = defineSecret('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE_KEY = defineSecret('VAPID_PRIVATE_KEY')
const VAPID_SUBJECT = defineSecret('VAPID_SUBJECT')

const REGION = 'us-central1'
const ALARM_PATH = '/pushAlarms/{uid}'

/**
 * The app writes /pushAlarms/{uid} when a period starts and deletes it when
 * the period stops. Each write books a Cloud Task for that exact instant.
 *
 * Tasks are never cancelled — cancelling would mean tracking task names and
 * racing the scheduler. Instead the database record is the single source of
 * truth: when the task fires it re-reads the record and only sends if the
 * deadline still matches. A period that was paused, split or abandoned has no
 * record, so its task fires into nothing.
 */
exports.scheduleAlarm = onValueWritten(
  { ref: ALARM_PATH, region: REGION },
  async event => {
    const after = event.data.after.val()
    if (!after) return                       // cancelled; its task will no-op
    const { endsAt } = after
    if (typeof endsAt !== 'number') return

    const before = event.data.before.val()
    if (before && before.endsAt === endsAt) return   // same deadline, already booked

    // Already due (clock skew, or a very short period) — send immediately.
    const delay = endsAt - Date.now()
    const uid = event.params.uid

    try {
      const queue = getFunctions().taskQueue('deliverAlarm')
      await queue.enqueue(
        { uid, endsAt },
        delay > 1000 ? { scheduleTime: new Date(endsAt) } : {},
      )
      logger.info('alarm booked', { uid, endsAt, inSeconds: Math.round(delay / 1000) })
    } catch (e) {
      logger.error('could not book the alarm', { uid, endsAt, error: e.message })
    }
  },
)

/**
 * Fires at the deadline. Sends the push only if the alarm is still the one
 * the app is waiting on, then clears it so it cannot fire twice.
 */
exports.deliverAlarm = onTaskDispatched(
  {
    region: REGION,
    secrets: [VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT],
    retryConfig: { maxAttempts: 3, minBackoffSeconds: 5 },
    rateLimits: { maxConcurrentDispatches: 20 },
  },
  async request => {
    const { uid, endsAt } = request.data || {}
    if (!uid || typeof endsAt !== 'number') return

    const alarmRef = getDatabase().ref(`pushAlarms/${uid}`)
    const snapshot = await alarmRef.get()
    const alarm = snapshot.val()

    if (!alarm) {
      logger.info('alarm was cancelled before it fired', { uid })
      return
    }
    if (alarm.endsAt !== endsAt) {
      logger.info('a newer period replaced this alarm', { uid, was: endsAt, now: alarm.endsAt })
      return
    }
    if (!alarm.subscription?.endpoint) {
      logger.warn('alarm has no push subscription', { uid })
      await alarmRef.remove()
      return
    }

    webpush.setVapidDetails(
      VAPID_SUBJECT.value(),
      VAPID_PUBLIC_KEY.value(),
      VAPID_PRIVATE_KEY.value(),
    )

    try {
      await webpush.sendNotification(alarm.subscription, JSON.stringify({
        title: alarm.title || 'Period finished',
        body: alarm.body || 'Tap to log what you were doing.',
        url: '/#/pomodoro/timer',
      }))
      logger.info('alarm delivered', { uid })
    } catch (e) {
      // 404/410 mean the subscription is dead — the app must resubscribe, so
      // there is nothing to retry.
      const gone = e.statusCode === 404 || e.statusCode === 410
      logger.error('push failed', { uid, statusCode: e.statusCode, error: e.message })
      if (!gone) throw e
    } finally {
      await alarmRef.remove().catch(() => {})
    }
  },
)
