# Document File View Skeleton Loading Design

## Goal

Show a file-row skeleton while the shared file view is waiting for its first page, matching the loading affordance used by the feed and list views.

## Approved behavior

- While the initial request is loading and no file rows are available, show the file table header and eight skeleton rows.
- Keep the desktop columns aligned with the existing file view: name, owner, uploaded date, and size.
- On narrow screens, keep the skeleton layout consistent with the existing responsive file rows and avoid page-level horizontal overflow.
- During subsequent page requests, preserve loaded file rows and keep the existing bottom loading indicator. The user selected this behavior over adding placeholder rows.
- Preserve existing error, empty, end-of-list, retry, refresh, background, and automatic pagination behavior.

## Scope

- Update the shared `FileView` initial-loading presentation only.
- Update the file-view tests for the initial skeleton and incremental loading indicator.
- Record the follow-up in the existing dated file-view direction, plan, detailed specification, and result document.
- No backend/API changes or data contract changes are needed.

## Verification

- Test that initial loading renders the file skeleton and does not report the empty state.
- Test that loading another page retains existing files and presents the bottom progress indicator rather than replacing the rows.
- Run the focused file-view and document-file page tests, then the frontend build.
- Verify the visual layout in the browser at 375px, 768px, and 1280px; capture results using synthetic data only.
