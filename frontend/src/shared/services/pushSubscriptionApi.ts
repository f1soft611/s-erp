import { apiDelete, apiGet, apiPost } from './apiClient';

const API_PATH = '/api/v1/groupware/push-subscriptions';

export interface PushSubscriptionStatus {
  enabled: boolean;
  activeDeviceCount: number;
  currentDevice: {
    subscribed: boolean;
    subscriptionId: number | null;
  };
  vapidPublicKey: string | null;
}

export interface PushSubscriptionRegistration {
  registered: true;
  subscriptionId: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function parseStatus(value: unknown): PushSubscriptionStatus {
  if (!isObject(value) || typeof value.enabled !== 'boolean'
    || !Number.isSafeInteger(value.activeDeviceCount) || Number(value.activeDeviceCount) < 0
    || !isObject(value.currentDevice)
    || typeof value.currentDevice.subscribed !== 'boolean'
    || !(value.currentDevice.subscriptionId === null
      || isPositiveSafeInteger(value.currentDevice.subscriptionId))
    || (value.currentDevice.subscribed !== (value.currentDevice.subscriptionId !== null))
    || !(value.vapidPublicKey === null || typeof value.vapidPublicKey === 'string')
    || (!value.enabled && value.vapidPublicKey !== null)) {
    throw new Error('웹 푸시 상태 응답을 확인할 수 없습니다.');
  }
  return {
    enabled: value.enabled,
    activeDeviceCount: Number(value.activeDeviceCount),
    currentDevice: {
      subscribed: value.currentDevice.subscribed,
      subscriptionId: value.currentDevice.subscriptionId,
    },
    vapidPublicKey: value.vapidPublicKey,
  };
}

export async function getPushSubscriptionStatus(
  endpointHash?: string,
): Promise<PushSubscriptionStatus> {
  if (endpointHash !== undefined && !/^[0-9a-f]{64}$/.test(endpointHash)) {
    throw new Error('웹 푸시 기기 정보가 올바르지 않습니다.');
  }
  const query = endpointHash ? `?endpointHash=${endpointHash}` : '';
  return parseStatus(await apiGet<unknown>(`${API_PATH}/status${query}`));
}

export async function registerPushSubscription(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
): Promise<PushSubscriptionRegistration> {
  const response = await apiPost<unknown>(API_PATH, subscription);
  if (!isObject(response) || response.registered !== true
    || !isPositiveSafeInteger(response.subscriptionId)) {
    throw new Error('웹 푸시 등록 응답을 확인할 수 없습니다.');
  }
  return { registered: true, subscriptionId: response.subscriptionId };
}

export async function unregisterPushSubscription(subscriptionId: number): Promise<void> {
  if (!isPositiveSafeInteger(subscriptionId)) {
    throw new Error('웹 푸시 기기 정보가 올바르지 않습니다.');
  }
  const response = await apiDelete<unknown>(`${API_PATH}/${subscriptionId}`);
  if (!isObject(response) || response.unsubscribed !== true) {
    throw new Error('웹 푸시 해제 응답을 확인할 수 없습니다.');
  }
}
