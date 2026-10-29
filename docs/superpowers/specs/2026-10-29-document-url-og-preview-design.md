# Document External URL Open Graph Preview

## Context and goal

The document composer and comment feed already render permission-checked cards for internal document-share links. External URLs currently remain plain links. Add an Open Graph-style preview for external HTTP(S) URLs without changing the existing encrypted internal sharing flow.

## Approaches considered

1. **Fetch metadata in the browser.** Small backend footprint, but cross-origin restrictions make behavior inconsistent and would expose each user's browser/IP to every linked host.
2. **Use a third-party preview provider.** Simple implementation, but sends document URLs to an unrelated service and introduces a new external dependency.
3. **Fetch metadata in the authenticated backend with strict outbound request controls (recommended).** Keeps browser behavior consistent and avoids a new vendor, while requiring careful SSRF, timeout, redirect, and response-size controls.

## Design

- Classify links before rendering. Same-origin document write URLs (`?share=` and supported legacy document IDs) continue through the existing permission-checked document preview. Only other absolute HTTP(S) URLs use the external web preview.
- Add an authenticated metadata endpoint that accepts a URL in a POST body and returns a small allowlisted DTO: site name, title, description, and optional Open Graph image URL. It never returns fetched HTML or echoes the URL.
- The backend validates scheme, host, user-info, port, DNS results, and every redirect target. Only globally routable addresses are eligible; DNS results used by the connection are pinned. Limit redirects, connect/read time, and response bytes; accept only HTML content. Do not log full URLs.
- Parse metadata without executing page content. Resolve relative image URLs against the final page URL; only allow HTTP(S) public destinations. Return bounded plain text values.
- Render external previews in a visually distinct “웹 링크” card, with an optional lazy-loaded image using `no-referrer`. Keep internal cards labelled and styled as document previews. Clicking an external card opens its destination in a new tab; it does not enter the internal document detail panel.
- Keep original links usable when metadata lookup fails. Do not persist preview metadata or add database objects. Collapse duplicate URLs within the same body and cancel/ignore stale lookup results when the content changes.

## Failure behavior and privacy

Invalid, blocked, non-HTML, oversized, timed-out, or unreachable targets do not break document/comment save or display. The card shows a generic unavailable state and the original link remains available. The metadata endpoint requires the current authenticated session, and URL values are not written to application logs. No third-party metadata provider is used.

## Validation

Cover internal/external classification, duplicate URLs, link edits, denied/invalid URLs, redirects to blocked addresses, DNS results containing private addresses, bounded response handling, malformed metadata, safe image URL handling, and lookup failures. Verify backend unit tests and frontend Vitest/build/lint, then check rendered content at 375px, 768px, and 1280px.
