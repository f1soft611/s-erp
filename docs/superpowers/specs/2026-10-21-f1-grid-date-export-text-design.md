# F1-Grid date Excel export as formatted text

## Context

F1-Grid exports `type: 'date'` values as Excel date cells. The approved follow-up changes that contract so the exported date text matches the grid's displayed date format and is horizontally centered.

## Decision

- Export non-empty `type: 'date'` values as strings produced by the existing `getCellDisplayValue` formatter.
- Center-align cells in `type: 'date'` columns, including blank and invalid-date fallback cells.
- Preserve existing handling for invalid dates: the grid display formatter returns the original value as text.
- Leave `datetime`, `time`, numeric, Boolean, and other column types unchanged.
- This intentionally removes Excel date arithmetic from `type: 'date'` cells in favor of matching the grid's visible format.

## Scope and validation

- Update the shared Excel exporter, focused XLSX export tests, F1-Grid documentation, and the dated result report.
- Verify exported date values are strings matching the configured grid format and have horizontal center alignment; verify other typed cells retain their existing values and formats.
- Run the focused export, date formatting, and F1-Grid documentation tests, then the frontend build.
- Do not modify the tagged `DocumentApprovalDetailFeed.tsx` or other unrelated worktree changes.
