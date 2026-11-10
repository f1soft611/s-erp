import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('PWA manifest', () => {
  it('declares standalone installation metadata and available icons', () => {
    const publicDirectory = resolve(process.cwd(), 'public');
    const manifest = JSON.parse(
      readFileSync(resolve(publicDirectory, 'manifest.webmanifest'), 'utf8'),
    ) as {
      name: string;
      short_name: string;
      start_url: string;
      scope: string;
      display: string;
      theme_color: string;
      icons: Array<{ src: string; sizes: string; type: string }>;
    };

    expect(manifest).toMatchObject({
      name: 'iPlusMES',
      short_name: 'iPlusMES',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      theme_color: '#1d4ed8',
    });
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png' }),
      expect.objectContaining({ src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' }),
    ]));
    for (const [fileName, size] of [
      ['pwa-icon-192.png', 192],
      ['pwa-icon-512.png', 512],
      ['apple-touch-icon.png', 180],
    ] as const) {
      const iconPath = resolve(publicDirectory, fileName);
      expect(existsSync(iconPath)).toBe(true);
      const icon = readFileSync(iconPath);
      expect(icon.readUInt32BE(16)).toBe(size);
      expect(icon.readUInt32BE(20)).toBe(size);
    }

    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png"');
    expect(html).toContain('<meta name="theme-color" content="#1d4ed8"');
  });
});
