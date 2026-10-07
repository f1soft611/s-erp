# 문서작성 결재선 컴팩트 표시 설계

## Status

Approved in conversation on 2026-10-07. This design supersedes the approval and agreement display sizing and row-visibility details in [Document Approval Display Layout](./2026-10-07-document-approval-display-layout-design.md). Its participant ordering, individual removal, and reference-selection rules remain in effect unless this document says otherwise.

## Goal

Keep the document-composer approval line compact and aligned to the dialog width. Show a default row of approval slots sized to the available dialog content; add further approval slots on subsequent rows only when committed approval participants exceed the first-row capacity. Hide the agreement row when there are no agreement participants.

## Layout

Render these rows in order:

1. **결재선** — retain the existing multi-user selector and `결재 추가` / `합의 추가` actions.
2. **결재** — render a responsive grid of approval slots. The first row is filled with empty slots to the available dialog width, even when no participants have been committed. Additional approval participants continue on subsequent rows without widening the dialog.
3. **합의** — render only when at least one agreement participant exists. Each participant remains an individually removable compact chip.
4. **참조** — retain the existing reference selector and behavior.

Each approval slot is at least 80px wide, with a 4px inter-slot gap. Derive the first-row capacity from the measured approval-grid content width:

```text
capacity = max(1, floor((contentWidth + gap) / (minimumSlotWidth + gap)))
```

Observe the grid container with `ResizeObserver` so the default number of visible slots follows the actual modal content width rather than a guessed viewport breakpoint. Render `max(capacity, committedApprovalCount)` grid cells. Empty default cells show only a subdued seal area; they do not display a sequence badge or delete action.

## Participant presentation

### Approval

Each committed approval cell retains the user's position/title and seal area. Its compact lower row shows:

- a small, soft-blue circular global-order badge;
- the participant name, constrained to approximately three Korean characters and shortened with an ellipsis when longer;
- an individual remove action.

Keep the full participant name available to assistive technology and through a title/tooltip. Empty cells do not reserve a sequence number.

### Agreement

When agreement participants exist, show one muted gray chip per participant. Each chip contains the same circular global-order badge, compact name with ellipsis, seal placeholder, and individual remove action. Do not show an avatar or stage-kind text.

### Ordering and removal

- Number committed approval and agreement users together in their existing stage/user order.
- Removing an approval user removes that approval stage; removing an agreement user removes only that member and prunes the group only when it becomes empty.
- Recalculate sequence badges and available approval candidates after removal.
- Keep reference selections independent and unchanged.

## Alternatives considered

1. **Width-measured equal columns with default empty slots (selected):** fills the first row to the dialog width, adapts to the actual modal size, and wraps excess committed approvals without page-level overflow.
2. **Fixed-width approval columns:** simple and stable, but can leave unused space on wide dialogs and does not make the initial approval line visually span the dialog.
3. **Single-row approval strip with horizontal scrolling:** preserves one row, but hides later participants on narrow screens and conflicts with the requested stacking behavior.

## Scope

- Update the document composer approval fields and participant-level removal wiring, plus focused tests and dated requirement/result documents.
- Keep the shared editor, user selector, common dialog, APIs, routes, backend, and database unchanged.
- Preserve existing position/title, seal, approval-order, and reference-selection behavior.

## Verification

- Test the four row labels/order, default empty approval slots, measured capacity and resize behavior, excess approval wrapping, badge/name/seal presentation, agreement-row conditional visibility, individual removal, sequence recalculation, candidate restoration, and unchanged reference selection.
- Check no page-level horizontal overflow at 375px, 768px, and 1280px.
- Run focused composer and user-selector tests, changed-file lint, and the frontend production build.
- Capture privacy-safe screenshots using synthetic names only.
