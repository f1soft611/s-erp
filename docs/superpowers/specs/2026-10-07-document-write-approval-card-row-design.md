# Document Write Approval Card Row Design

## Status

Approved by the user on 2026-10-07. This design supersedes the selector-card layout in `2026-10-07-document-write-approval-selector-fields-design.md`; the approval and agreement state semantics remain unchanged.

## Goal

Present approval stages as compact participant cards, matching the supplied reference image, and place approval and reference controls in two aligned rows in the document composer.

## Layout

- The approval row has a left-side `결재선` label and a right-side content area.
- Committed stages appear in order in the right-side area. Each approval participant is shown as one compact unit containing its sequence number, stage kind, profile image, name, department, seal area, and a remove (`×`) action.
- Each participant unit and each `결재 추가`/`합의 추가` button has the same rendered height as the active user selector. Keep the order/kind, avatar, name/department, seal, and remove action in a single compact row.
- The active multi-user selector follows the committed units, with `결재 추가` and `합의 추가` actions immediately beside it.
- The reference row is directly below the approval row, with a left-side `참조` label and one independent multi-select field on the right.
- On narrow viewports, only the approval content region may scroll horizontally. Labels stay visible and the page/dialog width must not grow.
- Do not show `선택 가능한 사용자가 없습니다.` beneath either user selector. Leave the selector empty and the approval actions disabled when no candidates remain.
- Set the document-composer `CommonDialog` surface, header, content, and footer backgrounds to white. Add an optional surface-background override to `CommonDialog`; keep the theme-based defaults for all other dialogs.
- Preserve the shared `UserSelectEditor` and rich-text editor behavior.
- On composer open, make the body editor fill the available height below the preceding fields. Keep a 180px minimum; long content expands naturally and uses modal-body scrolling. Normalize only the first block's outer top margin and last block's outer bottom margin so the editor's visible top/bottom whitespace stays equal. See [Document Composer Editor Fill-Height Design](./2026-10-07-document-composer-editor-fill-height-design.md).

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

- Component tests verify participant card content and height, role-specific grouping, sequence numbering, selection and commit controls, whole-stage removal, user candidate restoration, absence of the unavailable-user message, white composer dialog surfaces, and independent references.
- Browser verification at 375px, 768px, and 1280px confirms row alignment, visible labels, equal rendered heights for selector/card/actions, local approval-content scrolling, no page-level horizontal overflow, and modal/editor scroll behavior.
- Run focused document composer and shared user selector tests, frontend lint, and production build.

## Out of scope

Do not change routes, API contracts, persistence, backend, database, approval submission, or the underlying approval/agreement state model.
