# Document Write Approval Selector Fields Design

## Status

Superseded by the user-approved card-row design in [2026-10-07-document-write-approval-card-row-design.md](./2026-10-07-document-write-approval-card-row-design.md). The committed selector-box layout described here is historical and must not be treated as the current UI.

## Goal

Reduce vertical space in the document composer by placing approval-stage selectors in an ordered horizontal flow. Keep each stage's selected users visible in its field, add the next empty multi-select field after a stage is committed, and keep references in a separate multi-select field.

## Approved interaction

- The approval area is an ordered horizontal strip.
- Each approval-stage field supports multiple selected users. The final field is the only active field; committed fields retain their selected users as read-only chips that cannot be removed from the input.
- `결재 추가` and `합의 추가` determine the kind of the selected users when the active field is committed. Both actions are disabled while that field is empty.
- Committing a stage appends it after existing stages and adds a new empty multi-select field at the end.
- `결재 추가` preserves the existing behavior: each selected user becomes an individual approval stage in selection order.
- `합의 추가` preserves the existing behavior: all selected users become one agreement stage.
- Each committed field displays its stage kind, current order, selected users, the existing seal placeholder, and a remove action. Removing a stage renumbers later stages and makes its users available again.
- Users already committed to approval or agreement stages are excluded from the active approval field's candidates. Selected values remain visible in their field.
- The reference field remains one independent multi-select control. Selected references appear as input chips only; no duplicate preview list is shown.
- The approval strip uses its own horizontal scrolling on narrow screens. It must not expand the dialog or page width.
- The shared `UserSelectEditor`, `RichTextEditor`, and `CommonDialog` remain in use. This work does not add save, submit, approval API, backend, or database behavior.

## Alternatives considered

1. **Ordered multi-select fields with role-specific commit actions (recommended):** committed values remain visible in-place, and the next empty field is appended after the commit. This matches the requested numbered selector flow and allows agreement groups without a separate role dropdown.
2. **One shared multi-select control plus compact stage chips:** uses the least horizontal space, but does not leave a selector field for each committed position.
3. **Role dropdown on every row plus an explicit add-row button:** makes each row's kind explicit, but adds controls and requires another action to create the next field.

## Component and state design

- Keep the rendering and layout in `DocumentApprovalFields`.
- Ensure `UserSelectEditor`'s `readOnly` mode prevents deleting selected chips. Add a focused regression assertion so committed selector values cannot be modified by the chip's delete action.
- Keep `approvalStages` as the ordered, committed stage state in `useDocumentComposer`.
- Keep one `selectedApprovalUserIds` array for the active input; it is cleared only after `결재 추가` or `합의 추가` commits successfully.
- Render committed stage values from `approvalStages` in read-only `UserSelectEditor` fields. Render one active multi-select field after them.
- The active approval candidate list excludes users in committed stages. The reference selector continues to use the full user list independently.
- Use the existing stage IDs and removal callback; the rendered number comes from current list order rather than being persisted.

## Layout

- Place the approval label above a horizontal sequence of committed fields and the active field.
- Keep `결재 추가` and `합의 추가` beside the active field, not repeated beside committed fields.
- Preserve each field's number and role label. Use bounded field/card widths and `min-width: 0`; apply `overflow-x: auto` only to the approval strip.
- Keep the reference label and multi-select adjacent in its existing responsive grid column.
- Preserve the modal's vertical content scroll and natural-height editor behavior from the approved usability work.

## Error and empty states

- Preserve the current explicit lookup failure/loading states.
- When no users are available for the active approval field, keep the existing empty-state message and disabled commit actions.
- Empty active fields are not committed. A removed committed stage returns its users to the available approval candidates.
- Do not convert lookup failures into an empty-success state.

## Validation

- Verify a selected multi-user approval creates one ordered approval stage per user and appends an empty active field.
- Verify a multi-user agreement creates one group stage and appends an empty active field.
- Verify committed users are hidden from the active approval candidates, removal renumbers stages and releases users, and reference selection remains independent.
- Verify committed selector fields are read-only, the last field remains multi-select, and the role-specific actions apply only to that active field.
- Verify the approval strip scrolls locally at 375px and that the page has no horizontal overflow at 375px, 768px, and 1280px.
- Preserve document editor height/scroll behavior, loading/error behavior, and existing template/close-reset tests.
