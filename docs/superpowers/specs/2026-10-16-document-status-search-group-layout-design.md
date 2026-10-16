# Document Status Search Group Layout Design

## Goal

Configure the document-status detailed-search fields into four predictable rows using the existing F1-Grid `search.group` metadata, while preserving `search.span` as the width control inside every row:

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
- Use the existing five-column grid within each group. Apply each field's `search.span` to its width just as before; omitted spans default to one column. A group boundary starts a fresh five-column row.
- On narrow viewports, allow a group's controls to wrap/stack responsively without causing page-level horizontal overflow.
- Do not render group names as headings. They are layout metadata.
- Preserve `search.span` for grouped and ungrouped fields so width tuning remains available everywhere.
- Use distinct groups for the requested rows: submitted date, approval filters, title, and participants. Preserve existing document-status span values.

### Date range

- Remove only the visible caption currently rendered above the date inputs.
- Keep the visible and accessible input labels `결재신청일 시작일` and `결재신청일 종료일`, preserving keyboard/screen-reader identification and existing form-value shape `{ from, to }`.

### Data and behavior

- Keep `PageSearchArea` draft values, field updates, clear/search actions, and the status page's API filter mapping unchanged.
- Do not alter the search fields or add/remove filters; only adjust layout metadata and grouped layout rendering.

## Alternatives considered

- **Recommended: group-driven rows with span sizing.** Matches the request, makes row breaks explicit in metadata, and retains precise width control within each group.
- Continue using span-only layout. It can match one screen, but each field's width is encoded as unrelated numeric metadata and does not directly express row breaks.
- Add a status-page-only custom search form. This duplicates shared search behavior and disconnects layout from the column metadata.

## Testing

- Extend `PageSearchArea` tests to verify fields sharing a group appear in one row, groups split into separate rows in order, and `searchSpan` sizes fields within grouped and ungrouped rows.
- Verify grouped and ungrouped fields still use `searchSpan`.
- Verify the date caption is not rendered while accessible start/end labels remain and range updates are unchanged.
- Extend document-status column metadata tests to assert the four group assignments and expected ordering.
- Run the focused page-search and document-status tests, frontend build, and browser checks at 375px, 768px, and 1280px.

## Scope

Expected implementation files:

- `frontend/src/shared/components/PageSearchArea.tsx`
- `frontend/src/pages/groupware/documents/status/components/DocumentStatusGrid.tsx`
- Related page-search and document-status tests
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- The dated document-status plan/specification and result record

No API, backend, or database changes are required.
