# Document File Pagination Spinner and Dark Theme Design

## Goal

Make incremental file-page loading a spinner-only status and ensure the shared file list remains readable in both light and dark themes.

## Approved behavior

- While an additional file page is loading, preserve all loaded rows and show only a centered loading spinner; do not render the visible `파일 불러오는 중` text.
- Keep the loading state accessible with a status role and a concise Korean accessible label.
- Preserve a white file-list surface in light mode.
- In dark mode, use the application theme's `background.paper` surface rather than a fixed white surface so primary and secondary text, icons, row hover, and skeletons retain dark-theme contrast.
- Keep initial loading skeleton behavior, empty state, errors, retry actions, and automatic pagination unchanged.

## Scope

- Update the shared `frontend/src/shared/components/view-mode/FileView.tsx`.
- Add focused tests in `frontend/tests/file-view.test.tsx` for spinner-only pagination loading and theme-aware surfaces/contrast.
- Update the existing dated file-view direction, plan, specification, and result documentation.
- No API, pagination, or backend changes.

## Verification

- Verify an incremental loading render retains the loaded file row, exposes a status and progress indicator, and does not render the visible loading text.
- Verify the list surface remains white in light mode and uses the dark theme paper surface in dark mode; verify the spinner uses the theme primary color.
- Run the focused file-view and document-file page tests, then the frontend production build.
- Inspect the real FileView in a browser with light/dark themes and synthetic content; ensure there is no horizontal overflow at 375px, 768px, and 1280px.
