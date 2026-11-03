import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMocks = vi.hoisted(() => ({
  disablePushOnCurrentDevice: vi.fn(),
  enablePushOnCurrentDevice: vi.fn(),
  getPushSubscriptionStatus: vi.fn(),
}));
const profileMocks = vi.hoisted(() => ({
  fetchMyProfile: vi.fn(),
  updateMyProfile: vi.fn(),
}));
const notificationMocks = vi.hoisted(() => ({
  archiveNotification: vi.fn(),
  archiveReadNotifications: vi.fn(),
  listNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
}));
const messageMocks = vi.hoisted(() => ({
  markThreadRead: vi.fn(),
}));

vi.mock('../src/shared/services/pushSubscriptionService', () => pushMocks);
vi.mock('../src/pages/dashboard/services/profileSettings.service', () => profileMocks);
vi.mock('../src/shared/services/notificationService', () => notificationMocks);
vi.mock('../src/pages/groupware/messages/services/messageService', () => messageMocks);

import ProfileSettingsPage from '../src/pages/dashboard/ProfileSettingsPage';
import { NotificationInboxPage } from '../src/pages/groupware/notifications/NotificationInboxPage';

function CurrentLocation() {
  const location = useLocation();
  return <output aria-label="Current location">{`${location.pathname}${location.search}`}</output>;
}

describe('ProfileSettingsPage web push settings', () => {
  beforeEach(() => {
    pushMocks.disablePushOnCurrentDevice.mockReset();
    pushMocks.enablePushOnCurrentDevice.mockReset();
    pushMocks.getPushSubscriptionStatus.mockReset().mockResolvedValue({
      state: 'disabled',
      enabled: true,
      activeDeviceCount: 0,
      currentDevice: { subscribed: false, subscriptionId: null },
    });
    profileMocks.fetchMyProfile.mockResolvedValue({
      name: 'Test User',
      userId: 'test-user',
      departmentName: 'IT',
      levelName: 'Staff',
      email: 'test@example.test',
      profileImage: null,
      stampImage: null,
    });
    profileMocks.updateMyProfile.mockResolvedValue({
      name: 'Test User',
      userId: 'test-user',
      departmentName: 'IT',
      levelName: 'Staff',
      email: 'test@example.test',
      profileImage: null,
      stampImage: null,
    });
    notificationMocks.archiveNotification.mockResolvedValue(undefined);
    notificationMocks.archiveReadNotifications.mockResolvedValue({ archivedCount: 0 });
    notificationMocks.listNotifications.mockResolvedValue({
      resultList: [],
      hasNext: false,
      nextBeforeNotificationId: null,
    });
    notificationMocks.markNotificationRead.mockReset();
    messageMocks.markThreadRead.mockReset();
  });

  it('does not request permission on settings entry and enables only after explicit click', async () => {
    pushMocks.enablePushOnCurrentDevice.mockResolvedValue({ state: 'enabled' });
    render(<MemoryRouter><ProfileSettingsPage /></MemoryRouter>);
    await screen.findByRole('button', { name: '이 기기에서 웹 푸시 켜기' });
    expect(pushMocks.enablePushOnCurrentDevice).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '이 기기에서 웹 푸시 켜기' }));
    await waitFor(() => expect(pushMocks.enablePushOnCurrentDevice).toHaveBeenCalledTimes(1));
  });

  it('shows the denied state without coupling it to profile save', async () => {
    pushMocks.getPushSubscriptionStatus.mockResolvedValueOnce({ state: 'denied' });
    render(<MemoryRouter><ProfileSettingsPage /></MemoryRouter>);
    expect(await screen.findByText(/브라우저 설정에서 알림 권한을 허용/)).toBeVisible();
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: '이 기기에서 웹 푸시 켜기' })).not.toBeInTheDocument();
  });

  it('shows an unsupported state without offering an enable action', async () => {
    pushMocks.getPushSubscriptionStatus.mockResolvedValueOnce({
      state: 'unsupported',
      reason: 'secure-context',
    });
    render(<MemoryRouter><ProfileSettingsPage /></MemoryRouter>);
    expect(await screen.findByText(/현재 브라우저 또는 보안 연결/)).toBeVisible();
    expect(screen.queryByRole('button', { name: '이 기기에서 웹 푸시 켜기' })).not.toBeInTheDocument();
  });

  it('explains when web push is disabled on the server and does not offer enable', async () => {
    pushMocks.getPushSubscriptionStatus.mockResolvedValueOnce({
      state: 'disabled',
      enabled: false,
      activeDeviceCount: 0,
      currentDevice: { subscribed: false, subscriptionId: null },
    });
    render(<MemoryRouter><ProfileSettingsPage /></MemoryRouter>);
    expect(await screen.findByText(/서버에서 웹 푸시 기능이 꺼져 있습니다/)).toBeVisible();
    expect(screen.queryByRole('button', { name: '이 기기에서 웹 푸시 켜기' })).not.toBeInTheDocument();
  });

  it('shows safe status and enable failure details instead of hiding them', async () => {
    pushMocks.getPushSubscriptionStatus
      .mockRejectedValueOnce(new Error('웹 푸시 상태를 확인할 수 없습니다.'));
    render(<MemoryRouter><ProfileSettingsPage /></MemoryRouter>);
    expect(await screen.findByText('웹 푸시 상태를 확인할 수 없습니다.')).toBeVisible();

    pushMocks.getPushSubscriptionStatus.mockResolvedValueOnce({
      state: 'disabled',
      enabled: true,
      activeDeviceCount: 0,
      currentDevice: { subscribed: false, subscriptionId: null },
    });
    pushMocks.enablePushOnCurrentDevice.mockRejectedValueOnce(
      new Error('웹 푸시 공개키를 확인할 수 없습니다.'),
    );
    fireEvent.click(await screen.findByRole('button', { name: '이 기기에서 웹 푸시 켜기' }));
    expect(await screen.findByText('웹 푸시 공개키를 확인할 수 없습니다.')).toBeVisible();
  });

  it('offers current-device disable and reports API failures without changing profile state', async () => {
    pushMocks.getPushSubscriptionStatus.mockResolvedValue({
      state: 'enabled',
      enabled: true,
      activeDeviceCount: 1,
      currentDevice: { subscribed: true, subscriptionId: 31 },
    });
    pushMocks.disablePushOnCurrentDevice.mockRejectedValue(new Error('disable failed'));
    render(<MemoryRouter><ProfileSettingsPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: '이 기기에서 웹 푸시 끄기' }));
    expect(await screen.findByText('웹 푸시 설정을 변경하지 못했습니다. 다시 시도해 주세요.')).toBeVisible();
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
  });

  it('resolves a valid push notification through the existing notification API and path resolver', async () => {
    notificationMocks.markNotificationRead.mockResolvedValue({
      notificationId: 14,
      eventType: 'DIRECT_MESSAGE_RECEIVED',
      sourceType: 'DIRECT_MESSAGE',
      sourceId: 82,
      targetId: null,
      title: '새 쪽지',
      summary: '확인해 주세요',
      createdAt: '2026-10-30T09:30:00',
      readAt: '2026-10-30T09:31:00',
    });
    render(
      <MemoryRouter initialEntries={['/groupware/notifications?pushNotificationId=14']}>
        <NotificationInboxPage />
        <CurrentLocation />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByLabelText('Current location')).toHaveTextContent(
        '/groupware/messages?messageId=82',
      );
    });
    expect(notificationMocks.markNotificationRead).toHaveBeenCalledTimes(1);
    expect(notificationMocks.markNotificationRead).toHaveBeenCalledWith(14);
    expect(notificationMocks.listNotifications).toHaveBeenCalled();
    expect(messageMocks.markThreadRead).not.toHaveBeenCalled();
  });

  it('consumes an invalid push notification ID without reading or navigating away from the inbox', async () => {
    render(
      <MemoryRouter initialEntries={['/groupware/notifications?pushNotificationId=1e2']}>
        <NotificationInboxPage />
        <CurrentLocation />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByLabelText('Current location')).toHaveTextContent('/groupware/notifications');
    });
    expect(notificationMocks.markNotificationRead).not.toHaveBeenCalled();
  });

  it('keeps the inbox as fallback when the owner-scoped notification read fails', async () => {
    notificationMocks.markNotificationRead.mockRejectedValue(new Error('not found'));
    render(
      <MemoryRouter initialEntries={['/groupware/notifications?pushNotificationId=14']}>
        <NotificationInboxPage />
        <CurrentLocation />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByLabelText('Current location')).toHaveTextContent('/groupware/notifications');
    });
    expect(notificationMocks.markNotificationRead).toHaveBeenCalledWith(14);
  });
});
