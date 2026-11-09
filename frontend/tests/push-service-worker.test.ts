import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

function loadServiceWorker() {
  const source = readFileSync(resolve(process.cwd(), 'public', 'sw.js'), 'utf8');
  const listeners = new Map<string, (event: never) => void>();
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn();
  const self = {
    addEventListener: (type: string, listener: (event: never) => void) => listeners.set(type, listener),
    clients: { matchAll: vi.fn().mockResolvedValue([]), openWindow },
    location: { origin: 'https://erp.example.test' },
    registration: { showNotification },
  };
  new Function('self', source)(self);
  return { close, listeners, openWindow, showNotification };
}

describe('push service worker', () => {
  it('shows fixed generic copy for only a notification payload with a positive safe integer ID', async () => {
    const worker = loadServiceWorker();
    const waitUntil = vi.fn();
    worker.listeners.get('push')?.({
      data: { json: () => ({ notificationId: 14, kind: 'notification', url: 'https://evil.test' }) },
      waitUntil,
    } as never);
    await waitUntil.mock.calls[0][0];
    expect(worker.showNotification).toHaveBeenCalledWith(
      'iPlusMES',
      expect.objectContaining({
        body: '새 업무 알림이 왔습니다.',
        icon: '/push-icon.png',
        data: { notificationId: 14 },
      }),
    );
  });

  it('uses message copy without exposing payload text or sender details', async () => {
    const worker = loadServiceWorker();
    const waitUntil = vi.fn();
    worker.listeners.get('push')?.({
      data: { json: () => ({
        notificationId: 15, kind: 'notification', category: 'message',
        body: 'private message', title: 'private sender',
      }) },
      waitUntil,
    } as never);
    await waitUntil.mock.calls[0][0];
    expect(worker.showNotification).toHaveBeenCalledWith('iPlusMES', expect.objectContaining({
      body: '새 쪽지 알림이 왔습니다.', icon: '/push-icon.png',
      data: { notificationId: 15 },
    }));
  });

  it.each([
    { notificationId: 0, kind: 'notification' },
    { notificationId: 1.5, kind: 'notification' },
    { notificationId: Number.MAX_SAFE_INTEGER + 1, kind: 'notification' },
    { notificationId: 14, kind: 'message' },
  ])('ignores malformed push payloads: %o', async (payload) => {
    const worker = loadServiceWorker();
    const waitUntil = vi.fn();
    worker.listeners.get('push')?.({ data: { json: () => payload }, waitUntil } as never);
    await waitUntil.mock.calls[0]?.[0];
    expect(worker.showNotification).not.toHaveBeenCalled();
  });

  it('closes the notification and opens only the fixed same-origin inbox URL', async () => {
    const worker = loadServiceWorker();
    const waitUntil = vi.fn();
    worker.listeners.get('notificationclick')?.({
      notification: { data: { notificationId: 14, url: 'https://evil.test/' }, close: worker.close },
      waitUntil,
    } as never);
    await waitUntil.mock.calls[0][0];
    expect(worker.close).toHaveBeenCalledTimes(1);
    expect(worker.openWindow).toHaveBeenCalledWith(
      'https://erp.example.test/groupware/notifications?pushNotificationId=14',
    );
  });

  it('does not open a window for an invalid notification ID', async () => {
    const worker = loadServiceWorker();
    const waitUntil = vi.fn();
    worker.listeners.get('notificationclick')?.({
      notification: { data: { notificationId: -1 }, close: worker.close },
      waitUntil,
    } as never);
    expect(waitUntil).not.toHaveBeenCalled();
    expect(worker.openWindow).not.toHaveBeenCalled();
  });
});
