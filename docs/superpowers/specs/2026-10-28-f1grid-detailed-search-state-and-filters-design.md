# F1-Grid Detailed Search State and Filters

## Context

`PageSearchArea` supports F1-Grid detailed-search fields, but its collapsed control does not show whether any detailed criteria are applied. The panel reset restores every field at once, and several detailed-search pages do not restore the last executed query after navigating away and returning in the same tab.

Existing session-backed pages include common-code management, sales-order status, and document status. The missing session-backed pages are material management, customer management, draft-form management, and community archive.

## Considered approaches

1. **Infer applied filters from current form values.** This is small, but values change while typing, so it falsely marks unsubmitted drafts as applied and cannot reliably represent the executed query.
2. **Track the executed query per page and pass its detailed values to the shared search area (recommended).** This preserves the distinction between editable drafts and applied filters, supports exact session restoration, and keeps each page responsible for its own query contract. It requires focused wiring on each page.
3. **Move all query state into a new global F1-Grid search store.** This centralizes storage but couples the grid to page-specific API filters, default values, and unsaved-edit confirmation flows.

## Design

- Add an optional applied-detail-values input to `PageSearchArea`. The collapsed detail-search button is visibly active and exposes the number of active detailed criteria in its accessible description when one or more applied values are meaningful. Keep the existing accessible name. Editing form values alone does not activate it.
- Render one removable chip per applied detail field in the lower-left of the open detail panel. Use field labels and readable values (select labels and date ranges where applicable). Removing a chip clears only that field and invokes the page's existing detail-search callback. The keyword, other detail fields, and current view remain unchanged. Keep the existing reset-to-defaults, query, and close actions.
- Store only the last executed search snapshot in each page's tab-scoped `sessionStorage` using the existing `usePageSessionState` pattern, versioned and validated. Do not persist unsent field edits, grid selections, edits, or layout.
- Apply this state to material management, customer management, draft-form management, and community archive. Preserve existing session behavior in common-code management, sales-order status, and document status.
- If a page requires unsaved-grid confirmation, persist/apply the new snapshot only after confirmation. Cancelling leaves the executed query and active chips unchanged.
- Add optional `search.required` metadata and carry it into `PageSearchArea`. A required date criterion must have both endpoints and each endpoint must be valid; failed submission keeps the panel open, marks the missing/invalid endpoint, and does not run the query. Mark the sales-order status order date as required while retaining its current server-date defaults.
- Keep the open search panel above the F1-Grid loading overlay (z-index 12) during chip removal/reset-triggered refreshes, while leaving modal dialogs above the search panel.
- Default keyword search actions use the last applied detail snapshot, not an unsubmitted detail draft.
- Keep server/API contracts and F1-Grid data behavior unchanged. The page continues to own search conversion, loading, errors, and query execution.

## Validation

- Component tests cover applied-only visual state, readable active chips, and independent removal while preserving the other field values.
- Page tests cover session restoration, executed-query persistence, unsubmitted edits not replacing the snapshot, and confirmation cancel/continue behavior where applicable.
- Run focused Vitest tests and the frontend production build. Verify the shared search UI at 375px, 768px, and 1280px in a browser and record screenshots.

## Scope

This work changes the shared search-area UI, the seven F1-Grid detailed-search consumers, their focused tests, the F1-GRID guide, and dated task/plan/spec/result documents. It does not change APIs, backend code, database schema, or grid row/layout persistence.
