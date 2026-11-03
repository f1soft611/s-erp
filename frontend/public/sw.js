const PUSH_TITLE = 'S-ERP';
const PUSH_BODY = '새 업무 알림이 도착했습니다.';
const PUSH_ICON = '/favicon.svg';

function isNotificationId(value) {
  return Number.isSafeInteger(value) && value > 0;
}

self.addEventListener('push', (event) => {
  let payload;
  try {
    payload = event.data?.json();
  } catch {
    return;
  }
  if (!payload || payload.kind !== 'notification' || !isNotificationId(payload.notificationId)) {
    return;
  }
  event.waitUntil(self.registration.showNotification(PUSH_TITLE, {
    body: PUSH_BODY,
    icon: PUSH_ICON,
    tag: `notification-${payload.notificationId}`,
    renotify: false,
    data: { notificationId: payload.notificationId },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notificationId = event.notification.data?.notificationId;
  if (!isNotificationId(notificationId)) return;
  const destination = `${self.location.origin}/groupware/notifications?pushNotificationId=${notificationId}`;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if (new URL(client.url).origin === self.location.origin && 'navigate' in client) {
        await client.navigate(destination);
        return client.focus();
      }
    }
    return self.clients.openWindow(destination);
  })());
});
