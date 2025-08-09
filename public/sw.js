self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    if (event.data) data = event.data.json();
  } catch (_) {}
  const title = data.title || 'Notification';
  const options = {
    body: data.body || '',
    icon: '/next.svg',
    data: data.data || {},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const hadWindow = clientsArr.some((client) => {
        if (client.url === url && 'focus' in client) {
          client.focus();
          return true;
        }
        return false;
      });
      if (!hadWindow && self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});


