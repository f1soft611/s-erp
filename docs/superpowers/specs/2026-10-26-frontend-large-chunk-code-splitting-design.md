# Frontend Large-Chunk Code-Splitting Design

## Context

The production build currently emits an `index` JavaScript chunk of 1,192.30 kB, above the configured 1,000 kB warning threshold. `exceljs` is already separated into its own 929.57 kB chunk. Raising the warning threshold would hide the warning without reducing the code loaded at startup.

The route table statically imports every route page, and `App` statically imports the login-popup host. These imports make unrelated screens part of the initial bundle. `DashboardContent` also imports its available business pages, but those pages are used synchronously by existing screens and tests.

## Design

- Load route page modules on demand through `React.lazy`.
- Load the login-popup host through `React.lazy`, retaining its existing authentication subscription and behavior.
- Use the existing `AppLoadingSpinner` as the route-level `Suspense` fallback and `null` while the background popup host loads.
- Keep dashboard business-page rendering synchronous. The measured dashboard chunk is 476.38 kB, below the existing warning threshold, and splitting these components would add unnecessary async behavior to established screens.
- Keep current URLs, route matching, auth guards, and page selection unchanged.
- Keep the configured `chunkSizeWarningLimit` unchanged; the build should pass without large-chunk warnings rather than suppressing them.
- Let module-loading errors propagate through React's normal error handling; do not silently render a success-shaped fallback.

## Alternatives

1. Split route pages and dashboard business screens. This reduces the dashboard chunk further, but makes existing direct `DashboardContent` consumers asynchronous and requires broader changes to page-level tests. It is not selected because route-only splitting already removes the warning.
2. Raise `chunkSizeWarningLimit`. This does not reduce downloaded JavaScript and is not selected.

The selected approach splits the top-level route pages and the login-popup host only. Production output confirms the largest dashboard chunk is 476.38 kB and the largest emitted chunk is `vendor-exceljs` at 929.57 kB.

## Validation

- Run the frontend production build and confirm no chunk exceeds the existing 1,000 kB warning threshold.
- Run focused route tests for the not-found and authenticated dashboard paths, plus relevant page-loading tests.
- Confirm `git diff --check` succeeds and existing navigation/auth behavior remains intact.

## Scope

This change is limited to frontend loading boundaries, their directly related tests, and task documentation. It does not change backend/API/DB behavior, business-page content, route paths, or the warning threshold.
