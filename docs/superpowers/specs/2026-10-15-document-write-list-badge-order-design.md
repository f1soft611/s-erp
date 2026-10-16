# Document Write List Badge Order

## Status

Design approved by the user on 2026-10-15. The selected approach changes only the document-writing page's list view.

## Goal

Display approval status before document kind in list-style document rows without changing notice-list behavior.

## Existing behavior

- `ListView` is shared by the document-writing page and the community notice page.
- Each row currently renders its category chip before its status chip.
- The document-writing page maps document kind to `categoryLabel` and approval status to `statusLabel`.

## Approved design

- Add a typed optional badge-order prop to the shared `ListView`, defaulting to the existing category-then-status order.
- Pass the status-then-category order only from `DocumentWritePage`.
- Preserve the existing chip styling, labels, data, row interactions, and all other list behavior.
- Verify DOM order in the document-writing integration test and verify that the shared default still renders category before status.

## Alternatives considered

1. **Optional order prop, enabled only by document writing (selected):** keeps shared rendering, preserves all existing consumers by default, and expresses the page-specific behavior explicitly.
2. **Change the shared default order:** simpler but also changes community notice rows, which is outside the request.
3. **Create a document-specific list renderer:** isolates behavior but duplicates shared row presentation and interaction logic.

## Validation

- Add or update focused Vitest assertions for document-write status-before-kind DOM order and unchanged default shared-list order.
- Run the focused list/document-write tests and the frontend build.
- Run Problems validation and `git diff --check`.
- Confirm the existing list interaction remains intact; no responsive layout or data contract changes are intended.

## Out of scope

- Changing community notice list order.
- Changing badge colors, labels, sizing, filters, data mapping, or row interactions.
- Changing feed-style document presentation or the approval detail toolbar.
