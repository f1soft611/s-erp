import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProfileAvatar } from '../src/shared/components/ProfileAvatar';

describe('ProfileAvatar', () => {
  it('retains the same URL failure but retries it after a different or empty URL', () => {
    const onError = vi.fn();
    const first = 'data:image/png;base64,first';
    const second = 'data:image/png;base64,second';
    const view = (imageUrl: string | null) => (
      <ProfileAvatar name="Synthetic profile" imageUrl={imageUrl} fallback="SP" onError={onError} />
    );
    const { rerender } = render(view(first));
    const image = screen.getByRole('img', { name: 'Synthetic profile' });
    fireEvent.error(image);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].target).toBe(image);
    rerender(view(first));
    expect(screen.queryByRole('img', { name: 'Synthetic profile' })).not.toBeInTheDocument();
    expect(screen.getByText('SP')).toBeInTheDocument();

    rerender(view(second));
    expect(screen.getByRole('img', { name: 'Synthetic profile' })).toHaveAttribute('src', second);
    rerender(view(first));
    expect(screen.getByRole('img', { name: 'Synthetic profile' })).toHaveAttribute('src', first);
    fireEvent.error(screen.getByRole('img', { name: 'Synthetic profile' }));
    rerender(view(null));
    expect(screen.getByText('SP')).toBeInTheDocument();
    rerender(view(first));
    expect(screen.getByRole('img', { name: 'Synthetic profile' })).toHaveAttribute('src', first);
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it('renders the profile image with the user name as its accessible text', () => {
    render(
      <ProfileAvatar
        name="홍길동"
        imageUrl="data:image/png;base64,profile"
        fallback="홍"
      />,
    );

    expect(screen.getByRole('img', { name: '홍길동' })).toHaveAttribute(
      'src',
      'data:image/png;base64,profile',
    );
  });

  it.each([null, ''])('renders the caller fallback when image URL is %s', (imageUrl) => {
    render(
      <ProfileAvatar name="홍길동" imageUrl={imageUrl} fallback="홍" />,
    );

    expect(screen.getByText('홍')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: '홍길동' })).not.toBeInTheDocument();
  });

  it('shows the same caller fallback when the image fails to load', () => {
    render(
      <ProfileAvatar
        name="홍길동"
        imageUrl="https://example.invalid/profile.png"
        fallback="홍"
      />,
    );

    fireEvent.error(screen.getByRole('img', { name: '홍길동' }));

    expect(screen.getByText('홍')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: '홍길동' })).not.toBeInTheDocument();
  });
});
