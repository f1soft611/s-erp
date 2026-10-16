# Document Status Search Group Layout Design

## Goal

Configure the document-status detailed-search fields into four predictable rows using the existing F1-Grid `search.group` metadata, without requiring per-field `search.span` values:

1. Submitted-at date range
2. Approval status and document type
3. Title
4. Drafter, drafter department, and approval participant

Remove the redundant visible caption above the submitted-at date inputs. Keep accessible start-date and end-date names on the inputs.

## Current behavior

`toPageSearchFields` copies each column's `search.group` and `search.span`. `PageSearchArea` currently lays all fields into one five-column CSS grid and uses `searchSpan` to position and size each field. The `group` value is not used for layout. Date fields render an extra visible caption in addition to the start/end input labels.

## Design

### Metadata and row layout

- Treat each contiguous set of fields with the same non-empty `group` as one visual row. A different group begins a new row.
- Keep the existing `search.order` sorting as the order within and across rows.
- Within each group, distribute its fields evenly across that row at desktop widths; a one-field group fills the row.
- On narrow viewports, allow a group's controls to wrap/stack responsively without causing page-level horizontal overflow.
- Do not render group names as headings. They are layout metadata.
- Do not require `search.span` for the document-status layout. Preserve the existing `searchSpan` behavior for fields without a group so other pages do not change.
- Use distinct groups for the requested rows: submitted date, approval filters, title, and participants.

### Date range

- Remove only the visible caption currently rendered above the date inputs.
- Keep the visible and accessible input labels `결재신청일 시작일` and `결재신청일 종료일`, preserving keyboard/screen-reader identification and existing form-value shape `{ from, to }`.

### Data and behavior

- Keep `PageSearchArea` draft values, field updates, clear/search actions, and the status page's API filter mapping unchanged.
- Do not alter the search fields or add/remove filters; only adjust layout metadata and grouped layout rendering.

## Alternatives considered

- **Recommended: group-driven rows with span compatibility.** Matches the request, makes row intent explicit in metadata, and retains existing behavior for ungrouped pages.
- Continue using span-only layout. It can match one screen, but each field's width is encoded as unrelated numeric metadata and does not directly express row breaks.
- Add a status-page-only custom search form. This duplicates shared search behavior and disconnects layout from the column metadata.

## Testing

- Extend `PageSearchArea` tests to verify fields sharing a group appear in one row, groups split into separate rows in order, and group width is evenly distributed.
- Verify ungrouped fields still use `searchSpan`.
- Verify the date caption is not rendered while accessible start/end labels remain and range updates are unchanged.
- Extend document-status column metadata tests to assert the four group assignments and expected ordering.
- Run the focused page-search and document-status tests, frontend build, and browser checks at 375px, 768px, and 1280px.

## Scope

Expected implementation files:

- `frontend/src/shared/components/PageSearchArea.tsx`
- `frontend/src/shared/components/page-search/searchFields.ts` only if metadata typing needs adjustment
- `frontend/src/pages/groupware/documents/status/components/DocumentStatusGrid.tsx`
- Related page-search and document-status tests
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- The dated document-status plan/specification and result record

No API, backend, or database changes are required.
