/* Platform browser notifications — show OS banners and open the right page on click. */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data && event.notification.data.url
  if (!url) return

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (clientList) => {
        for (const client of clientList) {
          if (!client.url || !('focus' in client)) continue
          try {
            const origin = self.location.origin
            if (!client.url.startsWith(origin)) continue
            await client.focus()
            if (typeof client.navigate === 'function') {
              await client.navigate(url)
              return
            }
            client.postMessage({ type: 'NOTIFICATION_NAVIGATE', url })
            return
          } catch {
            /* try next client */
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url)
        }
        return undefined
      }),
  )
})
