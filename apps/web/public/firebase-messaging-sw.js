/* Agrogo alert push service worker (agri-api #37).
 *
 * Plain Web Push handler: no Firebase SDK here. The page obtains the FCM token
 * with this registration; FCM then delivers each alert as a standard push
 * event whose JSON payload carries {notification: {title, body}, data: {...}}.
 * We always show it (the tab may be closed) and open the alerts page on click.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim())
);

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { notification: { body: event.data ? event.data.text() : '' } };
  }
  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || 'Agrogo';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: notification.body || '',
      icon: '/favicon.ico',
      tag: data.alert_ids ? `alert-${data.alert_ids}` : undefined,
      data: { link: data.link || '/alerts' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link =
    (event.notification.data && event.notification.data.link) || '/alerts';
  const target = new URL(link, self.location.origin).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) => {
        for (const w of windows) {
          if (w.url.startsWith(self.location.origin) && 'focus' in w) {
            w.navigate(target);
            return w.focus();
          }
        }
        return self.clients.openWindow(target);
      })
  );
});
