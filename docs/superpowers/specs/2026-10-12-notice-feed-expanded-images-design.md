# Notice Feed Expanded Images Design

## Problem

Notice body images are visible in the collapsed feed preview and image viewer, but can appear broken when the user expands the feed body. The expanded HTML renderer currently follows a separate image-loading path from the collapsed preview.

## Evidence and current behavior

- Collapsed image previews use `AuthenticatedNoticeImage`, which requests protected image endpoints with `apiGetBlob` and displays a blob URL.
- Expanded content sanitizes and renders HTML, then a document-wide effect searches for deferred notice image sources and mutates matching `<img>` elements.
- That effect owns asynchronous loading and blob URL cleanup separately from the preview component.
- Existing tests cover stable-source normalization and the standalone authenticated image component, but do not cover loading an image inside expanded feed HTML.
- Browser reproduction on notice 81 confirmed that the authenticated image API returns HTTP 200 and the image initially loads. On a later feed rerender, React reapplies the source-less deferred HTML while the hydration effect does not rerun, leaving the image broken.
- Notice image endpoints, saved HTML/JSON, and backend authorization are out of scope and must remain unchanged.

## Considered approaches

1. **Keep hydrated HTML in React state (recommended).** Keep the sanitized HTML renderer and its formatting behavior, but replace DOM-only image mutation with a hydrated HTML state value. This ensures React reapplies the blob-backed HTML rather than restoring the source-less deferred markup on unrelated rerenders. Tie generated blob URLs to the active expanded content.
2. **Rebuild rich HTML as React nodes with authenticated image components.** This would unify image rendering at the component level, but adds broad rendering complexity and regression risk for the existing HTML formatting and table handling.

## Selected design

Keep the existing sanitized HTML and deferred-source contract. Hydrate protected image sources into an HTML string held in React state, so component rerenders preserve the blob-backed sources. Fetch each protected image using the existing `apiGetBlob` authentication flow and revoke its blob URL when the expanded content is replaced, collapsed, or unmounted, including when a request resolves after cleanup. Preserve the image `alt` text and all non-image HTML unchanged.

Do not alter storage, request routes, payloads, authorization, or the collapsed preview and image viewer implementations. Handle load failures explicitly using the existing notice UI error conventions rather than silently reporting a successful load.

## Expanded image loading experience

When a notice is expanded, show a per-image loading skeleton in place of each protected embedded image until its authenticated blob has been fetched and decoded. Do not expose an empty or broken `<img>` while the request is pending. Keep text and table content visible while images load.

Use the protected image's declared HTML width, height, and inline sizing metadata to reserve the skeleton's dimensions when available. If dimensions are absent, do not show a guessed-size placeholder while fetching. Decode the fetched blob to obtain its intrinsic size, then show a skeleton at the exact responsive dimensions for at least one rendered frame before replacing it with the blob-backed image. Keep the image constrained to the available body width and preserve its aspect ratio. Preserve the existing accessible failure message and object URL cleanup behavior.

The existing collapsed-preview skeleton is a fixed thumbnail, so it is not reused as the expanded image's dimensions. Rebuilding all notice HTML into React nodes and hiding the entire body while images load are intentionally excluded to preserve current rich HTML behavior and avoid delaying unrelated content.

## Verification

- Add a focused regression test rendering expanded notice HTML with a stable embedded-image API source; verify the authenticated blob request, displayed blob URL, and persistence through an unrelated feed rerender.
- Verify a pending request with declared dimensions displays an image-sized loading placeholder without rendering a broken image. With no declared dimensions, verify no broken image or guessed-size placeholder is shown before decode, then verify the exact-size skeleton is shown before the decoded image replaces it.
- Verify collapsing/replacing the body revokes URLs created by that body.
- Retain existing tests for source normalization, preview loading, HTML sanitization, and notice body formatting.
- Run the focused notice tests and frontend build.
- Verify the expanded image in the browser and record the result under `docs/result/20261012/notice-feed-expanded-images/`.
