import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AppSettingsProvider,
  useAppSettings,
} from '../src/shared/context/AppSettingsContext';

function DisplayScaleProbe() {
  const { displayScale } = useAppSettings();
  return <output aria-label="display scale">{displayScale}</output>;
}

describe('App settings default', () => {
  beforeEach(() => {
    window.localStorage.removeItem('erp-display-scale');
  });

  afterEach(() => {
    window.localStorage.removeItem('erp-display-scale');
  });

  it('uses the small scale when no scale preference is stored', () => {
    render(
      <AppSettingsProvider>
        <DisplayScaleProbe />
      </AppSettingsProvider>,
    );

    expect(screen.getByLabelText('display scale')).toHaveTextContent('0.9');
    expect(document.documentElement.style.fontSize).toBe('14.4px');
  });

  it('preserves a stored display scale preference', () => {
    window.localStorage.setItem('erp-display-scale', '1.2');

    render(
      <AppSettingsProvider>
        <DisplayScaleProbe />
      </AppSettingsProvider>,
    );

    expect(screen.getByLabelText('display scale')).toHaveTextContent('1.2');
    expect(document.documentElement.style.fontSize).toBe('19.2px');
  });
});
