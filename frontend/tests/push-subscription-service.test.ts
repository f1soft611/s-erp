import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiDelete, apiGet, apiPost } = vi.hoisted(() => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => ({ apiDelete, apiGet, apiPost }));

import {
  disablePushOnCurrentDevice,
  enablePushOnCurrentDevice,
  getPushSubscriptionStatus,
} from '../src/shared/services/pushSubscriptionService';

const endpoint = 'https://push.example.test/device-token';
const subscription = {
  endpoint,
  getKey: (name: string) => new Uint8Array(name === 'auth' ? 16 : 65).buffer,
  unsubscribe: vi.fn().mockResolvedValue(true),
  toJSON: () => ({
    endpoint,
    keys: { p256dh: 'public-key', auth: 'auth-key' },
  }),
};

function installBrowser({
  permission = 'granted',
  existingSubscription = null,
  secure = true,
} = {}) {
  const subscribe = vi.fn().mockResolvedValue(subscription);
  const getSubscription = vi.fn().mockResolvedValue(existingSubscription);
  const registration = { pushManager: { getSubscription, subscribe } };
  const register = vi.fn().mockResolvedValue(registration);
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: secure });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration: vi.fn().mockResolvedValue(registration), register },
  });
  Object.defineProperty(window, 'PushManager', { configurable: true, value: class {} });
  Object.defineProperty(window, 'Notification', {
    configurable: true,
    value: {
      permission,
      requestPermission: vi.fn().mockResolvedValue(permission),
    },
  });
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      ...window.crypto,
      subtle: { digest: vi.fn().mockResolvedValue(new Uint8Array(32).buffer) },
    },
  });
  return { getSubscription, register, registration, subscribe };
}

describe('push subscription service', () => {
  beforeEach(() => {
    apiDelete.mockReset();
    apiGet.mockReset();
    apiPost.mockReset();
    subscription.unsubscribe.mockReset().mockResolvedValue(true);
    apiGet.mockResolvedValue({
      enabled: true,
      activeDeviceCount: 0,
      currentDevice: { subscribed: false, subscriptionId: null },
      vapidPublicKey: 'B'.repeat(87),
    });
    apiPost.mockResolvedValue({ registered: true, subscriptionId: 31 });
    apiDelete.mockResolvedValue({ unsubscribed: true });
  });

  it('checks status without requesting notification permission', async () => {
    const browser = installBrowser({ permission: 'default' });
    await getPushSubscriptionStatus();
    expect(window.Notification.requestPermission).not.toHaveBeenCalled();
    expect(apiPost).not.toHaveBeenCalled();
    expect(browser.register).not.toHaveBeenCalled();
  });

  it('requests permission only when explicitly enabled and persists a new subscription', async () => {
    const browser = installBrowser({ permission: 'default' });
    window.Notification.requestPermission.mockResolvedValue('granted');
    await enablePushOnCurrentDevice();

    expect(window.Notification.requestPermission).toHaveBeenCalledTimes(1);
    expect(browser.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    expect(browser.getSubscription).toHaveBeenCalledTimes(1);
    expect(browser.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    });
    expect(apiPost).toHaveBeenCalledWith(
      '/api/v1/groupware/push-subscriptions',
      { endpoint, keys: { p256dh: 'public-key', auth: 'auth-key' } },
    );
    expect(apiPost.mock.calls[0][1]).not.toHaveProperty('userId');
    expect(apiPost.mock.calls[0][1]).not.toHaveProperty('tenantId');
  });

  it('does not register or create a subscription when permission is denied', async () => {
    const browser = installBrowser({ permission: 'denied' });
    window.Notification.requestPermission.mockResolvedValue('denied');
    await expect(enablePushOnCurrentDevice()).resolves.toMatchObject({ state: 'denied' });
    expect(browser.register).not.toHaveBeenCalled();
    expect(browser.subscribe).not.toHaveBeenCalled();
    expect(window.Notification.requestPermission).not.toHaveBeenCalled();
    expect(apiPost).not.toHaveBeenCalled();
  });

  it('does not register or create a subscription when the browser is unsupported', async () => {
    const browser = installBrowser({ secure: false });
    await expect(enablePushOnCurrentDevice()).resolves.toMatchObject({ state: 'unsupported' });
    expect(browser.register).not.toHaveBeenCalled();
    expect(browser.subscribe).not.toHaveBeenCalled();
    expect(window.Notification.requestPermission).not.toHaveBeenCalled();
    expect(apiPost).not.toHaveBeenCalled();
  });

  it('reuses a newly created browser subscription and does not register it twice on repeated enable', async () => {
    const browser = installBrowser();
    browser.getSubscription
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(subscription);
    apiGet.mockResolvedValueOnce({
      enabled: true,
      activeDeviceCount: 0,
      currentDevice: { subscribed: false, subscriptionId: null },
      vapidPublicKey: 'B'.repeat(87),
    }).mockResolvedValueOnce({
      enabled: true,
      activeDeviceCount: 1,
      currentDevice: { subscribed: true, subscriptionId: 31 },
      vapidPublicKey: 'B'.repeat(87),
    });
    await enablePushOnCurrentDevice();
    await enablePushOnCurrentDevice();
    expect(browser.subscribe).toHaveBeenCalledTimes(1);
    expect(apiPost).toHaveBeenCalledTimes(1);
  });

  it('keeps an existing browser subscription when server registration fails', async () => {
    installBrowser({ existingSubscription: subscription });
    apiPost.mockRejectedValue(new Error('registration failed'));
    await expect(enablePushOnCurrentDevice()).rejects.toThrow('registration failed');
    expect(subscription.unsubscribe).not.toHaveBeenCalled();
  });

  it('cleans up only a newly created browser subscription if API registration fails', async () => {
    installBrowser();
    apiPost.mockRejectedValue(new Error('registration failed'));
    await expect(enablePushOnCurrentDevice()).rejects.toThrow('registration failed');
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('unregisters only the current owner device before unsubscribing the browser subscription', async () => {
    installBrowser({ existingSubscription: subscription });
    apiGet.mockResolvedValue({
      enabled: true,
      activeDeviceCount: 1,
      currentDevice: { subscribed: true, subscriptionId: 31 },
      vapidPublicKey: null,
    });
    await disablePushOnCurrentDevice();
    expect(apiDelete).toHaveBeenCalledWith('/api/v1/groupware/push-subscriptions/31');
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('does not unsubscribe locally if backend deactivation fails', async () => {
    installBrowser({ existingSubscription: subscription });
    apiGet.mockResolvedValue({
      enabled: true,
      activeDeviceCount: 1,
      currentDevice: { subscribed: true, subscriptionId: 31 },
      vapidPublicKey: null,
    });
    apiDelete.mockRejectedValue(new Error('deactivation failed'));
    await expect(disablePushOnCurrentDevice()).rejects.toThrow('deactivation failed');
    expect(apiDelete).toHaveBeenCalledWith('/api/v1/groupware/push-subscriptions/31');
    expect(subscription.unsubscribe).not.toHaveBeenCalled();
  });

  it('does not treat a subscription owned by a previous account as enabled for this account', async () => {
    installBrowser({ existingSubscription: subscription });
    apiGet.mockResolvedValue({
      enabled: true,
      activeDeviceCount: 0,
      currentDevice: { subscribed: false, subscriptionId: null },
      vapidPublicKey: 'B'.repeat(87),
    });
    await expect(getPushSubscriptionStatus()).resolves.toMatchObject({
      currentDevice: { subscribed: false, subscriptionId: null },
    });
    expect(apiGet).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/v1\/groupware\/push-subscriptions\/status\?endpointHash=[0-9a-f]{64}$/),
    );
  });

  it('does not unsubscribe a browser subscription that the current account does not own', async () => {
    installBrowser({ existingSubscription: subscription });
    apiGet.mockResolvedValue({
      enabled: true,
      activeDeviceCount: 0,
      currentDevice: { subscribed: false, subscriptionId: null },
      vapidPublicKey: 'B'.repeat(87),
    });
    await disablePushOnCurrentDevice();
    expect(apiDelete).not.toHaveBeenCalled();
    expect(subscription.unsubscribe).not.toHaveBeenCalled();
  });

  it('rejects malformed status payloads instead of trusting unknown API data', async () => {
    installBrowser();
    apiGet.mockResolvedValue({
      enabled: true,
      activeDeviceCount: -1,
      currentDevice: { subscribed: false, subscriptionId: null },
      vapidPublicKey: 'B'.repeat(87),
    });
    await expect(getPushSubscriptionStatus()).rejects.toThrow('웹 푸시 상태 응답을 확인할 수 없습니다.');
  });
});
