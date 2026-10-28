# F1-Grid Search Submit and Required Status Date

## Context

Applied search chips currently clear their field and immediately call the page search callback. This is convenient for small lists but can trigger repeated expensive requests when users remove several conditions. The document-status page also has a date criterion, `결재신청일`, but it is not marked required; a restored legacy tab session without that date can therefore issue an unbounded initial request.

## Considered approaches

1. Keep immediate search and add a debounce. This reduces request bursts but still queries before users finish adjusting conditions.
2. Make chip removal edit-only and require the explicit detail-search action (recommended). It reuses the existing draft/applied state boundary and avoids unnecessary network requests. Applied chips continue to describe the current result until the new query succeeds; a pending-change hint clarifies that the edited criteria have not yet been applied.
3. Add a separate apply/cancel workflow for all detail edits. This is a broader interaction change and is unnecessary for the requested chip behavior.

## Design

- Clicking a chip's remove control clears that field in the editable detailed-search values only. It does not call `onDetailSearch`, perform validation, persist a new search snapshot, or reload the grid.
- Subsequent chip removals are based on the latest draft values so one staged removal cannot restore a prior removal.
- A chip disappears immediately when its optional criterion is removed, while remaining chips stay visible. The applied query, grid results, and count of executed conditions remain unchanged until the user submits a new query. A short status message indicates that a removal is pending and must be applied with the detailed-search `조회` button. Optional-field remove controls are disabled after their field has already been cleared in the draft; required criteria cannot be removed at all.
- In the detail-search footer, desktop chips and reset/search/close actions occupy the first row; the pending-change message appears across the full width of the following row. At narrow widths, actions remain top-right on the first row and chips move below so their labels remain readable. The action group never wraps.
- The existing detailed-search `조회` action remains the commit point: it validates required fields, then delegates to the existing page search handler. Reset behavior is unchanged. The document-status page replaces a missing/invalid required date from an older saved session with the current server-provided default before its initial query.
- Treat the existing document-status list (the page with the `결재신청일` field) as the user's “업무현황” target. Mark its `submittedAt` date range required for interactive search.
- Existing date defaults remain unchanged. When a saved session from before this requirement omits `submittedAt`, merge the current server-provided default date range into the restored snapshot before the first list query, so the initial query also has the required reference date.
- Record a contributor rule: every newly created status page must define a required reference-date search criterion. Date ranges require both valid endpoints at submission.
- Keep backend/API contracts and unrelated reset, keyword-search, and grid loading behavior unchanged.

## Validation

- Unit tests prove removing one or several chips only updates draft values, preserves other staged edits, and does not invoke search. A pending status is visible while applied chips remain tied to the current query.
- Document-status tests prove the required metadata and validation block missing date submissions, and legacy sessions receive the date defaults before the first request.
- Focused frontend tests and production build pass; result documentation records the browser layout/behavior check.
