# Notice Feed Expanded Images Design

## Problem

Notice body images are visible in the collapsed feed preview and image viewer, but can appear broken when the user expands the feed body. The expanded HTML renderer currently follows a separate image-loading path from the collapsed preview.

## Evidence and current behavior

- Collapsed image previews use `AuthenticatedNoticeImage`, which requests protected image endpoints with `apiGetBlob` and displays a blob URL.
- Expanded content sanitizes and renders HTML, then a document-wide effect searches for deferred notice image sources and mutates matching `<img>` elements.
- That effect owns asynchronous loading and blob URL cleanup separately from the preview component.
- Existing tests cover stable-source normalization and the standalone authenticated image component, but do not cover loading an image inside expanded feed HTML.
- Notice image endpoints, saved HTML/JSON, and backend authorization are out of scope and must remain unchanged.

## Considered approaches

1. **Stabilize the expanded-body hydration path (recommended).** Keep the sanitized HTML renderer and its formatting behavior; limit image hydration to the expanded body container and give the generated blob URLs a lifecycle tied to that content. This is the smallest change and preserves tables, typography, previews, and viewer behavior.
2. **Rebuild rich HTML as React nodes with authenticated image components.** This would unify image rendering at the component level, but adds broad rendering complexity and regression risk for the existing HTML formatting and table handling.

## Selected design

Keep the existing sanitized HTML and deferred-source contract. Make authenticated image hydration specific to the expanded body content, so each image is loaded using the existing `apiGetBlob` authentication flow and its blob URL is revoked when the expanded content is replaced, collapsed, or unmounted. Preserve the image `alt` text and all non-image HTML unchanged.

Do not alter storage, request routes, payloads, authorization, or the collapsed preview and image viewer implementations. Handle load failures explicitly using the existing notice UI error conventions rather than silently reporting a successful load.

## Verification

- Add a focused regression test rendering expanded notice HTML with a stable embedded-image API source; verify the authenticated blob request and displayed blob URL.
- Verify collapsing/replacing the body revokes URLs created by that body.
- Retain existing tests for source normalization, preview loading, HTML sanitization, and notice body formatting.
- Run the focused notice tests and frontend build.
- Verify the expanded image in the browser and record the result under `docs/result/20261012/notice-feed-expanded-images/`.
