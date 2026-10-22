# F1-Grid date text and alignment in Excel export

## Context

F1-Grid exports `type: 'date'` values as Excel date cells. The approved follow-up changes date values to match the Grid's displayed text and also carries the Grid's header and cell alignments into Excel.

## Decision

- Export non-empty `type: 'date'` values as strings produced by the existing `getCellDisplayValue` formatter.
- Apply each column's `headerAlign` to the Excel header. If unset, use the Grid header's default centered alignment.
- Apply each column's `align` to Excel data cells. If unset, use the Grid cell's default: `number` and `rownumber` right-aligned, all other types left-aligned.
- Preserve existing handling for invalid dates: the grid display formatter returns the original value as text.
- Preserve existing values and number formats for `datetime`, `time`, numeric, Boolean, and other column types; only their alignment is newly synchronized with the Grid.
- This intentionally removes Excel date arithmetic from `type: 'date'` cells in favor of matching the grid's visible format.

## Scope and validation

- Update the shared Excel exporter, focused XLSX export tests, F1-Grid documentation, and the dated result report.
- Verify exported date values are strings matching the configured grid format; verify header and body alignment for explicit and default Grid alignment rules, including blank and invalid cells.
- Verify other typed cells retain their existing values and formats.
- Run the focused export, date formatting, and F1-Grid documentation tests, then the frontend build.
- Do not modify the tagged `DocumentApprovalDetailFeed.tsx` or other unrelated worktree changes.
