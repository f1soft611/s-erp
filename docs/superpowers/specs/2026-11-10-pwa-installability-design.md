# iPlusMES PWA Installability Design

## Goal

Let users install the existing iPlusMES web application from a supported mobile browser and launch it from the home screen. When installation is available, show a dismissible in-app install reminder rather than sending an OS notification.

## Scope

### Included

- Add a web app manifest with iPlusMES name, root launch URL/scope, standalone display, theme metadata, and application icons.
- Add the manifest and mobile web app metadata to the Vite HTML entry.
- Reuse the existing branded push icon to produce appropriately sized application icons.
- Show an in-app install reminder when the browser exposes `beforeinstallprompt`; invoke the native prompt only after the user selects the install action.
- On iOS browsers, where the native prompt event is unavailable, show brief Add to Home Screen instructions.
- Hide the reminder when the app is already running in standalone mode, after installation, or after the user dismisses it.
- Keep the reminder responsive and available on login and application routes.

### Excluded

- Offline caching or precaching application data.
- Changes to the existing Web Push subscription or `/sw.js` notification/click behavior.
- Sending OS notifications to users to ask them to install the application.
- Native app store distribution, backend changes, or new API contracts.

## Architecture

Use the platform web app manifest directly; do not add a second service worker or a PWA plugin for this installability-only change. The existing `/sw.js` remains owned by Web Push and continues to be registered only through the user's explicit push opt-in flow. The manifest supports install metadata independently of that opt-in.

Place the install reminder at the application root so it can observe browser install events regardless of the current route. It detects standalone display mode, listens for the browser install prompt and `appinstalled` events, and stores dismissal in local storage. The install action calls `prompt()` only in response to a user gesture. For iOS, the reminder explains the browser's Share > Add to Home Screen flow; it does not request notification permission.

## User experience

- Supported browsers show a compact, dismissible install reminder only when the app is not installed and an install prompt is available.
- The install button opens the browser's native confirmation flow. Dismissing that native prompt does not change application notification permissions.
- iOS shows a short manual installation hint because Safari does not expose `beforeinstallprompt`.
- Installed standalone sessions and dismissed reminders do not show the reminder again.
- The reminder must not cover critical controls at 375px, 768px, or 1280px widths.

## Failure and compatibility behavior

- If manifest metadata or browser installation APIs are unavailable, the application continues to work normally without a reminder.
- In-app install guidance is informational and does not imply offline availability.
- Existing Web Push registration and notification behavior is unchanged.

## Verification

- Verify manifest metadata and referenced icon files in the production build.
- Test install prompt, install completion, standalone detection, iOS instructions, and dismissal behavior.
- Run frontend tests, build, and lint.
- Verify the rendered reminder at 375px, 768px, and 1280px in a real browser and capture result screenshots.
