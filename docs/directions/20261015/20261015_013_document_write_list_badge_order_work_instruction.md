# Document Write List Badge Order Work Instruction

**Document ID:** 20261015_013

## Purpose

In the document-writing page's list view, display approval status before document kind.

## Approved behavior

- The order in document-writing list rows is approval status → document kind.
- Keep the existing category-first order as the default for other `ListView` consumers, including community notices.
- Preserve labels, badge styles, data mapping, row interactions, and feed/detail behavior.

## Work procedure

1. Record the implementation plan and detailed specification in the dated documentation folders.
2. Add regression assertions for document-write list order and the shared list's unchanged default order.
3. Add an optional, typed badge-order setting to `ListView` and enable status-first only for `DocumentWritePage`.
4. Run focused Vitest coverage, the frontend build, Problems validation, and `git diff --check`.
5. Verify the list in a browser at 375px, 768px, and 1280px; save screenshots in the dated result folder.
6. Record implementation and validation outcomes in a dated result document.

## Completion criteria

- Document-write list rows expose status before document kind in DOM and visual order.
- Other `ListView` consumers retain category before status without a prop.
- Existing badge appearance and list-row behavior remain unchanged.
- Focused tests and frontend build pass, with dated result documentation and browser screenshots.

## Scope exclusions

- Changing notice-list order.
- Changing feed-style documents, approval detail, API/data contracts, badge styling, or click behavior.
