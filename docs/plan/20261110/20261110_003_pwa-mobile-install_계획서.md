# iPlusMES PWA Installability Implementation Plan

> **For agentic workers:** Implement each task in order and verify each focused command before continuing. Steps use checkbox syntax for tracking.

**Goal:** Make iPlusMES installable from supported mobile browsers and guide uninstalled users without sending an OS notification.

**Architecture:** Serve a static web app manifest and correctly sized app icons from Vite's `public` directory. Keep a React reminder mounted inside the router so it can capture `beforeinstallprompt` before login, but enable its UI only for authenticated users at `/groupware/overview`. Give iOS users manual Add to Home Screen instructions and do not change the existing Web Push service worker.

**Tech Stack:** React 19, TypeScript, Vite 8, MUI, Vitest, Testing Library, Playwright.

---

## Files and responsibilities

- `frontend/public/manifest.webmanifest`: app identity, root scope, standalone launch, theme color and icon paths.
- `frontend/public/pwa-icon-192.png`, `frontend/public/pwa-icon-512.png`, `frontend/public/apple-touch-icon.png`: platform app icons derived from the existing branded `push-icon.png`.
- `frontend/index.html`: manifest and mobile installation metadata.
- `frontend/src/shared/components/PwaInstallPrompt.tsx`: browser event handling, standalone/iOS detection, install action and seven-day dismissal cooldown.
- `frontend/src/routes/AppRouter.tsx`: keep the reminder mounted across routes and enable it only for authenticated users at `/`.
- `frontend/tests/pwa-install-prompt.test.tsx`: install event, user gesture, iOS instructions, standalone, install completion and dismissal regression tests.
- `frontend/tests/pwa-manifest.test.ts`: static manifest and icon reference validation.
- `frontend/tests/pwa-install.browser.mjs`: repeatable real-browser check at supported responsive widths and screenshot capture.
- `docs/directions/20261110/20261110_003_pwa-mobile-install_작업지시서.md`: implementation request and acceptance criteria.
- `docs/spec/20261110/20261110_003_pwa-mobile-install_상세사양서.md`: detailed browser behavior and verification contract.
- `docs/result/20261110/pwa-mobile-install/result.md` and `screenshots/`: results and responsive browser evidence.

### Task 1: Add failing tests for install guidance

**Files:**
- Create: `frontend/tests/pwa-install-prompt.test.tsx`
- Create: `frontend/tests/pwa-manifest.test.ts`

- [ ] **Step 1: Write behavior tests**

Use Testing Library and Vitest to cover the critical transitions:

```tsx
it('opens the native prompt only after the user selects install', async () => {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
  });

  render(<PwaInstallPrompt />);
  act(() => window.dispatchEvent(event));
  const installButton = await screen.findByRole('button', { name: '앱 설치' });

  expect(prompt).not.toHaveBeenCalled();
  fireEvent.click(installButton);
  await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
});
```

Add separate tests that set `navigator.userAgent` to an iOS value and confirm the Share > Add to Home Screen instructions, set `(display-mode: standalone)` to true and confirm no reminder, dispatch `appinstalled` and confirm it is hidden, and verify dismissal suppresses the reminder for seven days but allows it again once seven days have elapsed. Treat the legacy `true` dismissal value as expired because it has no timestamp.

The manifest test reads `frontend/public/manifest.webmanifest`, asserts `name`, `short_name`, `start_url`, `scope`, `display`, `theme_color` and icon sizes, then confirms each icon path exists.

- [ ] **Step 2: Run tests and verify the missing behavior fails**

Run from `frontend`:

```powershell
npm run test -- tests/pwa-install-prompt.test.tsx tests/pwa-manifest.test.ts
```

Expected: FAIL because the component, manifest and icon assets do not exist yet.

### Task 2: Add static PWA metadata and icons

**Files:**
- Create: `frontend/public/manifest.webmanifest`
- Create: `frontend/public/pwa-icon-192.png`
- Create: `frontend/public/pwa-icon-512.png`
- Create: `frontend/public/apple-touch-icon.png`
- Modify: `frontend/index.html`

- [ ] **Step 1: Create manifest and link it from HTML**

The manifest must have this shape:

```json
{
  "name": "iPlusMES",
  "short_name": "iPlusMES",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#f4f7fb",
  "theme_color": "#1d4ed8",
  "icons": [
    { "src": "/pwa-icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/pwa-icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Add `<link rel="manifest" href="/manifest.webmanifest">`, `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`, `<meta name="theme-color" content="#1d4ed8">`, and the Apple standalone status-bar metadata to `frontend/index.html`. Keep the existing viewport, title, favicon, and entry script unchanged.

- [ ] **Step 2: Derive the platform icons**

Resize `frontend/public/push-icon.png` without changing its aspect ratio to exactly 192×192, 512×512 and 180×180 PNG files. Preserve the existing source file unchanged.

- [ ] **Step 3: Run the static manifest test**

```powershell
npm run test -- tests/pwa-manifest.test.ts
```

Expected: PASS with all three local icon files present and the manifest fields matching the install contract.

### Task 3: Implement the router-level install reminder

**Files:**
- Create: `frontend/src/shared/components/PwaInstallPrompt.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/tests/pwa-install-prompt.test.tsx`

- [ ] **Step 1: Implement the browser event type and display-mode check**

Define a local event type with `prompt(): Promise<void>` and `userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>`. Treat the application as installed if `matchMedia('(display-mode: standalone)').matches` or iOS `navigator.standalone` is true. Do not register or alter a service worker.

- [ ] **Step 2: Implement install and dismissal transitions**

Listen for `beforeinstallprompt` and `appinstalled` in an effect, remove both listeners on cleanup, and preserve the install event until the user action. Call `preventDefault()` on the install event and `prompt()` only in the click handler. Hide and persist completion after accepted install or `appinstalled`. Store the dismissal time in milliseconds under a namespaced key such as `iplusmes:pwa-install-dismissed`; suppress the reminder for seven days after the close action or a dismissed native prompt, then allow it again. Treat legacy non-timestamp values as expired. Catch no errors silently and do not request `Notification` permission.

- [ ] **Step 3: Render the supported-browser and iOS guidance**

For browsers with a saved install event, show a compact MUI `Snackbar`/`Alert` with `앱 설치` and `설치 안내 닫기` actions. For an iOS user agent that is not standalone, show `공유 메뉴에서 홈 화면에 추가를 선택해 설치할 수 있습니다.` with a close action. Render nothing for unsupported platforms, completed installs, standalone mode, or a dismissal less than seven days old.

- [ ] **Step 4: Gate the reminder to the authenticated main screen**

Render `<PwaInstallPrompt enabled={isAuthenticated && pathname === '/groupware/overview'} />` once inside `AppRouter`, outside the route switch, so its browser event listener remains active before login while its banner is shown only on the authenticated main screen. Remove the app-root mount from `App.tsx`.

- [ ] **Step 5: Run focused component tests**

```powershell
npm run test -- tests/pwa-install-prompt.test.tsx
```

Expected: PASS for prompt user gesture, accepted/dismissed result, `appinstalled`, standalone, iOS instructions, dismissal cooldown, and reappearance after seven days.

### Task 4: Verify build, existing Web Push, and responsive browser behavior

**Files:**
- Test: `frontend/tests/pwa-install-prompt.test.tsx`
- Test: `frontend/tests/pwa-manifest.test.ts`
- Test: `frontend/tests/push-service-worker.test.ts`
- Test: `frontend/tests/pwa-install.browser.mjs`
- Create: `docs/result/20261110/pwa-mobile-install/result.md`
- Create: `docs/result/20261110/pwa-mobile-install/screenshots/` (English filenames)

- [ ] **Step 1: Run focused regression tests**

```powershell
npm run test -- tests/pwa-install-prompt.test.tsx tests/pwa-manifest.test.ts tests/push-service-worker.test.ts
```

Expected: PASS, including unchanged generic push payload and notification click behavior.

- [ ] **Step 2: Run production build and lint**

```powershell
npm run build
npx oxlint src/shared/components/PwaInstallPrompt.tsx src/App.tsx tests/pwa-install-prompt.test.tsx tests/pwa-manifest.test.ts
```

Expected: both commands exit 0; `dist/manifest.webmanifest` and the three icon assets exist.

- [ ] **Step 3: Verify browser layouts and capture screenshots**

Run the app on `http://127.0.0.1:4173` using the existing iPlusMES Vite dev server, or start it with `npm run dev -- --strictPort` only if the port is free. At 375px, 768px and 1280px, verify the reminder doesn't overlap or block route controls, verify iOS instruction content and native install action in browser-capable mode, and capture screenshots with English filenames under `docs/result/20261110/pwa-mobile-install/screenshots/`. Stop only the server started for this check.

- [ ] **Step 4: Write the result record**

Record changed files, the exact commands and pass/fail results, browser dimensions, screenshot filenames, the distinction between in-app install guidance and Web Push notifications, iOS/manual-install limitations, and the fact that offline use is not included.
