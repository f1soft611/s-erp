import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  dismissBootSplash,
  scheduleBootSplashFailsafe,
} from '../src/shared/bootSplash';
import { BootSplashReady } from '../src/shared/components/BootSplashReady';

const indexHtml = readFileSync(resolve(__dirname, '../index.html'), 'utf-8');

function addSplash(opacity: string) {
  const splash = document.createElement('div');
  splash.id = 'boot-splash';
  splash.style.opacity = opacity;
  document.body.appendChild(splash);
  return splash;
}

afterEach(() => {
  document.getElementById('boot-splash')?.remove();
  vi.useRealTimers();
});

describe('boot splash dismiss', () => {
  it('removes the splash immediately when it has not become visible yet', () => {
    addSplash('0');
    dismissBootSplash();
    expect(document.getElementById('boot-splash')).toBeNull();
  });

  it('fades out a visible splash before removing it', () => {
    vi.useFakeTimers();
    const splash = addSplash('1');
    dismissBootSplash();
    expect(splash).toHaveClass('is-leaving');
    expect(document.getElementById('boot-splash')).not.toBeNull();
    vi.advanceTimersByTime(400);
    expect(document.getElementById('boot-splash')).toBeNull();
  });

  it('does nothing when there is no splash', () => {
    expect(() => dismissBootSplash()).not.toThrow();
  });

  it('dismisses when the ready component commits', () => {
    addSplash('0');
    render(<BootSplashReady />);
    expect(document.getElementById('boot-splash')).toBeNull();
  });

  it('dismisses after the failsafe delay even without a ready signal', () => {
    vi.useFakeTimers();
    addSplash('0');
    scheduleBootSplashFailsafe(15000);
    vi.advanceTimersByTime(14999);
    expect(document.getElementById('boot-splash')).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(document.getElementById('boot-splash')).toBeNull();
  });
});

describe('index.html boot splash contract', () => {
  it('places the splash before #root so it shows before the bundle loads', () => {
    const splashAt = indexHtml.indexOf('id="boot-splash"');
    const rootAt = indexHtml.indexOf('id="root"');
    expect(splashAt).toBeGreaterThan(-1);
    expect(rootAt).toBeGreaterThan(splashAt);
  });

  it('delays appearance by 300ms, supports dark theme and reduced motion', () => {
    expect(indexHtml).toMatch(/animation:\s*boot-in[^;]*\.3s/);
    expect(indexHtml).toContain('data-boot-theme="dark"');
    expect(indexHtml).toContain("localStorage.getItem('erp-theme')");
    expect(indexHtml).toContain('prefers-reduced-motion');
    expect(indexHtml).toContain('role="status"');
  });
});
