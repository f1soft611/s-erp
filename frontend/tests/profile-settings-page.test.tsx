import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfileSettingsPage from '../src/pages/dashboard/ProfileSettingsPage';
import * as profileService from '../src/pages/dashboard/services/profileSettings.service';

vi.mock('../src/pages/dashboard/services/profileSettings.service', () => ({
  fetchMyProfile: vi.fn(),
  updateMyProfile: vi.fn(),
}));

describe('ProfileSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(profileService.fetchMyProfile).mockResolvedValue({
      userId: 'admin',
      employeeId: 42,
      name: '사용자명',
      email: 'user@example.com',
      departmentName: '개발팀',
      levelName: '사원',
      profileImage: null,
      stampImage: null,
    });
    vi.mocked(profileService.updateMyProfile).mockResolvedValue({
      userId: 'admin',
      employeeId: 42,
      name: '사용자명',
      email: 'new@example.com',
      departmentName: '개발팀',
      levelName: '사원',
      profileImage: null,
      stampImage: null,
    });
  });

  it('retries an initial failure without exposing the empty profile form', async () => {
    vi.mocked(profileService.fetchMyProfile).mockRejectedValueOnce(new Error('initial failed'));
    render(<MemoryRouter><ProfileSettingsPage /></MemoryRouter>);
    const retry = await screen.findByRole('button', { name: '내 정보 다시 불러오기' });
    expect(screen.queryByLabelText(/이메일/i)).not.toBeInTheDocument();
    expect(screen.queryByText('이미지')).not.toBeInTheDocument();
    fireEvent.click(retry);
    await waitFor(() => expect(screen.getByLabelText(/이메일/i)).toHaveValue('user@example.com'));
  });

  it('retains the edited email when saving fails instead of replacing the form', async () => {
    vi.mocked(profileService.updateMyProfile).mockRejectedValueOnce(new Error('save failed'));
    render(<MemoryRouter><ProfileSettingsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByLabelText(/이메일/i)).toHaveValue('user@example.com'));
    fireEvent.change(screen.getByLabelText(/이메일/i), { target: { value: 'edited@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /저장/i }));
    expect(await screen.findByText('save failed')).toBeInTheDocument();
    expect(screen.getByLabelText(/이메일/i)).toHaveValue('edited@example.com');
    expect(screen.queryByRole('button', { name: '내 정보 다시 불러오기' })).not.toBeInTheDocument();
  });

  it.each(['success', 'failure'] as const)('shows a small saving spinner until profile save %s', async (outcome) => {
    let finish!: () => void;
    vi.mocked(profileService.updateMyProfile).mockImplementationOnce(() => new Promise((resolve, reject) => {
      finish = () => {
        if (outcome === 'failure') reject(new Error('save failed'));
        else resolve({
          userId: 'admin', employeeId: 42, name: '사용자명', email: 'new@example.com',
          departmentName: '개발팀', levelName: '사원', profileImage: null, stampImage: null,
        });
      };
    }));
    render(<MemoryRouter><ProfileSettingsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByLabelText(/이메일/i)).toHaveValue('user@example.com'));
    fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
    const savingButton = screen.getByRole('button', { name: '저장 중...', exact: true });
    expect(savingButton).toBeDisabled();
    expect(screen.getByRole('progressbar', { name: '저장 중' }))
      .toHaveStyle({ width: '16px', height: '16px' });
    fireEvent.click(savingButton);
    expect(profileService.updateMyProfile).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장', exact: true })).toBeEnabled();
  });

  it('loads and saves the authenticated profile email', async () => {
    render(
      <MemoryRouter>
        <ProfileSettingsPage />
      </MemoryRouter>,
    );

    const emailInput = await screen.findByLabelText(/이메일/i);
    await waitFor(() => expect(emailInput).toHaveValue('user@example.com'));

    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /저장/i }));

    await waitFor(() => {
      expect(profileService.updateMyProfile).toHaveBeenCalledWith({
        email: 'new@example.com',
        profileImage: null,
        stampImage: null,
      });
    });
    expect(await screen.findByText('내 정보가 저장되었습니다.')).toBeInTheDocument();
  });
});
