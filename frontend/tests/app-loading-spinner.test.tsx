import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppLoadingSpinner } from '../src/shared/components/AppLoadingSpinner';

describe('AppLoadingSpinner', () => {
  it('uses the 34px size with a 3.6px default and supports a thinner override', () => {
    render(
      <>
        <AppLoadingSpinner />
        <AppLoadingSpinner thickness={1.8} />
      </>,
    );

    const progressbars = screen.getAllByRole('progressbar');
    expect(progressbars).toHaveLength(2);
    for (const progressbar of progressbars) {
      expect(progressbar).toHaveStyle({ width: '34px', height: '34px' });
    }
    const defaultCircle = progressbars[0].querySelector('circle');
    const overrideCircle = progressbars[1].querySelector('circle');
    expect(defaultCircle).not.toBeNull();
    expect(overrideCircle).not.toBeNull();
    expect(defaultCircle).toHaveAttribute('stroke-width', '3.6');
    expect(overrideCircle).toHaveAttribute('stroke-width', '1.8');
  });
});
