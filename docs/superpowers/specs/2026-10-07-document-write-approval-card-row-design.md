# Document Write Approval Card Row Design

## Status

Approved by the user on 2026-10-07. This design supersedes the selector-card layout in `2026-10-07-document-write-approval-selector-fields-design.md`; the approval and agreement state semantics remain unchanged.

## Goal

Present approval stages as compact participant cards, matching the supplied reference image, and place approval and reference controls in two aligned rows in the document composer.

## Layout

- The approval row has a left-side `결재선` label and a right-side content area.
- Committed stages appear in order in the right-side area. Each approval participant is shown as one compact unit containing its sequence number, profile image, name, department, seal area, and a remove (`×`) action.
- The active multi-user selector follows the committed units, with `결재` and `합의` actions immediately beside it.
- The reference row is directly below the approval row, with a left-side `참조` label and one independent multi-select field on the right.
- On narrow viewports, only the approval content region may scroll horizontally. Labels stay visible and the page/dialog width must not grow.
- Preserve the shared `UserSelectEditor`, `CommonDialog`, and rich-text editor behavior.

## Stage behavior

- `결재` commits each selected user as an individual approval stage in selection order.
- `합의` commits all selected users as one agreement stage.
- Approval cards show their stage number, profile image, name, department, seal placeholder, and remove action.
- Agreement is one stage and keeps its members together. Its card displays each member's profile image, name, and department with the agreement stage number, seal placeholder, and a single remove action for the entire stage.
- Removing a card removes its entire approval or agreement stage. Remaining stages are renumbered in order and removed users become available in the active selector again.
- Users in committed stages are excluded from the active approval selector. References remain independent and may include approval participants.
- Empty approval selections cannot be committed. Existing candidate filtering, selection order, loading/error behavior, and modal scroll remain unchanged.

## Alternatives

1. **Side label with inline participant cards and controls (recommended):** matches the supplied reference and keeps the approval and reference rows visually aligned.
2. Label above the approval content: less constrained on small viewports but does not match the reference's form-row layout.
3. Use one large approval-stage selector per committed stage: preserves the earlier UI but spends more horizontal and vertical space and does not resemble the reference.

## Validation

- Component tests verify participant card content, role-specific grouping, sequence numbering, selection and commit controls, whole-stage removal, user candidate restoration, and independent references.
- Browser verification at 375px, 768px, and 1280px confirms row alignment, visible labels, local approval-content scrolling, no page-level horizontal overflow, and modal/editor scroll behavior.
- Run focused document composer and shared user selector tests, frontend lint, and production build.

## Out of scope

Do not change routes, API contracts, persistence, backend, database, approval submission, or the underlying approval/agreement state model.
