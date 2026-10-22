import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileAvatar } from '../src/shared/components/ProfileAvatar';

describe('ProfileAvatar', () => {
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
