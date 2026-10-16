# Document Write Active Filter Chips Design

## Goal

Replace the document-writing page's `전체 조회` reset button with visible,
individually removable chips for the currently applied list filters.

## Current context

The document-writing page has three list filter values:

- `scope`: approval/status range, initially `ALL`
- `selectedKind`: document kind, initially empty
- `selectedDocumentId`: a single document selected from the approval notice

The first implementation added one `전체 조회` button that clears all three
values. The user requested that the same toolbar position show the active
filter conditions instead, with an `X` on each condition to cancel it.

## Approved design

Remove the `전체 조회` button. In its existing toolbar position beside the
document-kind filter control, show one MUI Chip per active filter. Chip labels
use hashtag-style values without a category prefix:

- Selected approval scope: `#` plus its existing user-facing scope label, such
  as `#결재 진행 중`, `#승인`, or `#작성 중 문서`
- Selected document kind: `#` plus the full kind, such as `#기안서`
- Selected notice document: `#` plus its title, such as `#문서제목`

Only active conditions are shown. When no filters are active, render no
condition chips. Chips wrap naturally on narrow widths without forcing
horizontal page overflow.

Each chip is independently removable:

- Removing the scope chip sets `scope` to `ALL` and preserves kind and document
  filters.
- Removing the kind chip clears `selectedKind` and preserves scope and document
  filters.
- Removing the document chip clears `selectedDocumentId` and preserves scope
  and kind filters.

After removal, the existing list effect reloads data using the remaining
conditions. The current feed/list view mode is preserved. Existing filter menu,
summary-panel scope selection, notice selection, loading, and error behavior
remain intact. There is no separate global reset button in this design.

Use the Chip's accessible delete action. The accessible name must identify the
condition being removed, so same-looking controls remain distinguishable to
screen-reader and keyboard users.

## Architecture and data

Keep the existing three filter states as the source of truth. Derive chip
descriptors in `useDocumentWritePage` from those values. Reuse the existing
scope labels from the approval summary and document status panels. Derive the
selected document title from the summary notice already used by
`selectNotice`; if the selected notice is absent from the latest summary,
display a stable non-sensitive fallback based on the document identifier
rather than rendering a blank control.

The page renders these descriptors alongside the existing kind filter. Chip
delete callbacks clear only their corresponding state. No API, backend,
database, or document-processing behavior changes are needed.

## Alternatives considered

1. Replace the reset button in place with individually removable filter chips
   (selected). This makes active conditions immediately visible with minimal
   vertical space.
2. Add a separate applied-filters row below the toolbar. This provides more
   room, but shifts the document list and duplicates the same filter state.
3. Keep the global reset button alongside chips. This is redundant when each
   chip is independently removable and does not match the requested
   replacement.

## Verification

- Test each chip's label, visibility, and independent deletion.
- Test that remaining filters are kept in the next list request.
- Test scope, kind, and specific-document chip deletion in both existing feed
  and list flows, without changing view mode.
- Confirm no reset button remains and no chip is rendered at the default
  unfiltered state.
- Run focused Vitest tests and the frontend production build.
- Verify chip wrapping and no horizontal overflow at 375px, 768px, and 1280px
  in an authenticated browser session.

## Scope

Only the document-writing filter toolbar, its hook state exposure, associated
frontend tests, and corresponding dated work documents/results are in scope.
Preserve the existing worktree changes; do not alter unrelated work. No
backend, API, or database changes.
