# Frontend Large-Chunk Code-Splitting Design

## Context

The production build currently emits an `index` JavaScript chunk of 1,192.30 kB, above the configured 1,000 kB warning threshold. `exceljs` is already separated into its own 929.57 kB chunk. Raising the warning threshold would hide the warning without reducing the code loaded at startup.

The route table statically imports every route page. `DashboardContent` also statically imports its available business pages, and `App` statically imports the login-popup host. These imports make unrelated screens part of the initial bundle.

## Design

- Load route page modules on demand through `React.lazy`.
- Load dashboard business-page modules on demand so visiting the dashboard does not eagerly download every possible screen.
- Load the login-popup host on demand while retaining its existing authentication subscription and behavior.
- Use the existing `AppLoadingSpinner` as the `Suspense` fallback. Keep current URLs, route matching, auth guards, and page selection unchanged.
- Keep the configured `chunkSizeWarningLimit` unchanged; the build should pass without large-chunk warnings rather than suppressing them.
- Let module-loading errors propagate through React's normal error handling; do not silently render a success-shaped fallback.

## Alternatives

1. Split only the top-level routes. This is smaller, but the dashboard can remain a large chunk because its content statically imports all business pages.
2. Raise `chunkSizeWarningLimit`. This does not reduce downloaded JavaScript and is not selected.

The selected approach splits route pages and dashboard business screens at their existing boundaries.

## Validation

- Run the frontend production build and confirm no chunk exceeds the existing 1,000 kB warning threshold.
- Run focused route tests for the not-found and authenticated dashboard paths, plus relevant page-loading tests.
- Confirm `git diff --check` succeeds and existing navigation/auth behavior remains intact.

## Scope

This change is limited to frontend loading boundaries, their directly related tests, and task documentation. It does not change backend/API/DB behavior, business-page content, route paths, or the warning threshold.
