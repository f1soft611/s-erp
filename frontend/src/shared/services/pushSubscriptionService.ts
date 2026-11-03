import {
  getPushSubscriptionStatus as fetchPushStatus,
  registerPushSubscription,
  unregisterPushSubscription,
  type PushSubscriptionStatus,
} from './pushSubscriptionApi';

export type PushDeviceState = 'loading' | 'enabled' | 'disabled' | 'denied' | 'unsupported' | 'error';

export interface PushDeviceStatus {
  state: PushDeviceState;
  enabled?: boolean;
  activeDeviceCount?: number;
  currentDevice?: PushSubscriptionStatus['currentDevice'];
  reason?: string;
}

type PushRegistration = ServiceWorkerRegistration & {
  pushManager: PushManager;
};

function browserSupportError(): string | null {
  if (typeof window === 'undefined' || !window.isSecureContext) return 'secure-context';
  if (!navigator.serviceWorker) return 'service-worker';
  if (!('PushManager' in window)) return 'push-manager';
  if (!('Notification' in window)) return 'notification';
  if (!globalThis.crypto?.subtle?.digest) return 'web-crypto';
  return null;
}

function isRegistration(value: ServiceWorkerRegistration): value is PushRegistration {
  return 'pushManager' in value;
}

async function endpointHash(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function decodeApplicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function readSubscription(subscription: PushSubscription): {
  endpoint: string;
  keys: { p256dh: string; auth: string };
} {
  const value: unknown = subscription.toJSON();
  if (!isObject(value)) {
    throw new Error('웹 푸시 기기 정보를 확인할 수 없습니다.');
  }
  const keys = value.keys;
  if (typeof value.endpoint !== 'string' || !value.endpoint.startsWith('https://')
    || !isObject(keys)) {
    throw new Error('웹 푸시 기기 정보를 확인할 수 없습니다.');
  }
  if (typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') {
    throw new Error('웹 푸시 기기 정보를 확인할 수 없습니다.');
  }
  return {
    endpoint: value.endpoint,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function statusFromApi(
  status: PushSubscriptionStatus,
  subscribed: boolean,
): PushDeviceStatus {
  const currentDevice = subscribed
    ? status.currentDevice
    : { subscribed: false, subscriptionId: null };
  return {
    state: currentDevice.subscribed ? 'enabled' : 'disabled',
    enabled: status.enabled,
    activeDeviceCount: status.activeDeviceCount,
    currentDevice,
  };
}

async function currentRegistration(): Promise<PushRegistration | null> {
  const registration = await navigator.serviceWorker.getRegistration('/');
  return registration && isRegistration(registration) ? registration : null;
}

export async function getPushSubscriptionStatus(): Promise<PushDeviceStatus> {
  const reason = browserSupportError();
  if (reason) return { state: 'unsupported', reason };

  const registration = await currentRegistration();
  const subscription = registration ? await registration.pushManager.getSubscription() : null;
  const status = await fetchPushStatus(
    subscription ? await endpointHash(subscription.endpoint) : undefined,
  );
  const deviceStatus = statusFromApi(status, subscription !== null);
  return Notification.permission === 'denied'
    ? { ...deviceStatus, state: 'denied' }
    : deviceStatus;
}

export async function enablePushOnCurrentDevice(): Promise<PushDeviceStatus> {
  const reason = browserSupportError();
  if (reason) return { state: 'unsupported', reason };
  if (Notification.permission === 'denied') return { state: 'denied' };

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  if (permission !== 'granted') return { state: 'denied' };

  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  if (!isRegistration(registration)) return { state: 'unsupported', reason: 'push-manager' };
  let subscription = await registration.pushManager.getSubscription();
  const wasExisting = subscription !== null;
  const status = await fetchPushStatus(
    subscription ? await endpointHash(subscription.endpoint) : undefined,
  );
  if (!status.enabled) throw new Error('웹 푸시 기능을 사용할 수 없습니다.');
  if (subscription && status.currentDevice.subscribed) {
    return statusFromApi(status, true);
  }

  if (!subscription) {
    if (!status.vapidPublicKey) {
      throw new Error('웹 푸시 공개키를 확인할 수 없습니다.');
    }
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeApplicationServerKey(status.vapidPublicKey),
    });
  }

  try {
    const registrationResult = await registerPushSubscription(readSubscription(subscription));
    return {
      state: 'enabled',
      enabled: true,
      activeDeviceCount: status.activeDeviceCount + (status.currentDevice.subscribed ? 0 : 1),
      currentDevice: { subscribed: true, subscriptionId: registrationResult.subscriptionId },
    };
  } catch (error) {
    if (!wasExisting) {
      await Promise.resolve().then(() => subscription.unsubscribe()).catch(() => false);
    }
    throw error;
  }
}

export async function disablePushOnCurrentDevice(): Promise<PushDeviceStatus> {
  const reason = browserSupportError();
  if (reason) return { state: 'unsupported', reason };
  const registration = await currentRegistration();
  const subscription = registration ? await registration.pushManager.getSubscription() : null;
  if (!subscription) {
    return { state: 'disabled', enabled: true, activeDeviceCount: 0 };
  }
  const status = await fetchPushStatus(await endpointHash(subscription.endpoint));
  if (!status.currentDevice.subscribed || status.currentDevice.subscriptionId === null) {
    return statusFromApi(status, false);
  }
  await unregisterPushSubscription(status.currentDevice.subscriptionId);
  const unsubscribed = await subscription.unsubscribe();
  if (!unsubscribed) throw new Error('이 기기의 웹 푸시 구독을 해제하지 못했습니다.');
  return {
    state: 'disabled',
    enabled: status.enabled,
    activeDeviceCount: Math.max(0, status.activeDeviceCount - 1),
    currentDevice: { subscribed: false, subscriptionId: null },
  };
}
