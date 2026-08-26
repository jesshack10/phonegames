/* Push-only service worker.
 *
 * Deliberately has NO fetch handler and caches nothing: the app is served
 * from GitHub Pages with hashed assets, and a caching worker would risk
 * serving a stale build with no easy way for you to clear it from a phone.
 * Its only job is to receive a push while the app is closed and show the
 * notification — which is the one thing a suspended page cannot do itself.
 */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

self.addEventListener('push', event => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { /* keep defaults */ }

  const title = data.title || 'Period finished'
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || 'Tap to log what you were doing.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    // One period at a time: a later alarm replaces an unread earlier one.
    tag: 'pomodoro-period',
    renotify: true,
    requireInteraction: false,
    data: { url: data.url || '/#/pomodoro/timer' },
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of open) {
      if ('focus' in client) {
        await client.focus()
        if ('navigate' in client) await client.navigate(url).catch(() => {})
        return
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(url)
  })())
})
