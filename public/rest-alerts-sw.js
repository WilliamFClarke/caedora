// Shows a notification when a workout rest timer ends, while the tracker is in the background.
// It holds only the time the rest ends and the exercise name, for the length of one rest.
// Nothing is sent to a server: the timer runs on the phone.

const TAG = 'caedora-rest'
let pending = null

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

function cancelPending() {
  if (!pending) return
  clearTimeout(pending.timer)
  pending.resolve()
  pending = null
}

self.addEventListener('message', (event) => {
  const data = event.data || {}
  if (data.type === 'rest-cancel') {
    cancelPending()
    event.waitUntil(closeShown())
    return
  }
  if (data.type !== 'rest-start' || typeof data.endsAt !== 'number') return
  cancelPending()
  const wait = Math.max(0, data.endsAt - Date.now())
  // Keeping the message event open keeps the worker running until the rest ends,
  // even when the page itself is paused because the phone is locked.
  event.waitUntil(
    Promise.all([
      closeShown(),
      new Promise((resolve) => {
        const entry = {
          resolve,
          timer: setTimeout(() => {
            if (pending === entry) pending = null
            notify(data).finally(resolve)
          }, wait),
        }
        pending = entry
      }),
    ])
  )
})

async function closeShown() {
  const shown = await self.registration.getNotifications({ tag: TAG })
  for (const notification of shown) notification.close()
}

async function notify(data) {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  // The tracker beeps and buzzes itself when someone is looking at it.
  if (windows.some((client) => client.visibilityState === 'visible' && client.focused)) return
  const exercise = typeof data.exercise === 'string' && data.exercise ? data.exercise : 'your next exercise'
  await self.registration.showNotification('Rest over', {
    body: `Time for your next set of ${exercise}.`,
    tag: TAG,
    renotify: true,
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/vault' },
  })
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/vault'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => 'focus' in client)
      if (open) return open.focus()
      return self.clients.openWindow(url)
    })
  )
})
