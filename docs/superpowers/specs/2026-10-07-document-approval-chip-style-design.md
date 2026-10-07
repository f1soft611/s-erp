# Document Approval Participant Chip Design

## Status

Superseded by [Document Approval Display Layout Design](./2026-10-07-document-approval-display-layout-design.md) on 2026-10-07 after the user clarified that approval participants belong in a wrapping table layout and agreement participants belong in individual wrapping chips.

## Goal

Restyle each committed approval or agreement stage as a compact, light-gray chip that matches the supplied reference image and remains legible beside the active approver selector.

## Appearance

- Render each stage as one compact, light neutral-gray container with rounded corners and a subtle boundary. The whole stage should read as one chip, not as multiple nested chips.
- Keep the existing 40px stage height and single-line horizontal layout.
- Show stage sequence in a compact badge, followed by the stage kind (`결재` or `합의`), profile image, participant name, the existing seal slot, and the existing whole-stage remove (`X`) action.
- Omit department text from committed participant chips.
- For an agreement stage, keep all selected participants inside the same stage chip, each with their profile and name. The sequence, kind, seal, and remove action belong to the stage.
- Preserve existing avatar fallbacks, accessible labels, stage numbering, and remove-button behavior.

## Behavior and scope

- Change only the committed stage presentation in `DocumentApprovalFields`.
- Keep candidate filtering, multi-selection order, approval/agreement grouping, active selector, button states, stage removal, and candidate restoration unchanged.
- Keep the approval strip as the only horizontally scrollable region for these controls; do not introduce page-level horizontal overflow.
- Do not change the shared user selector, common dialog, editor, API, persistence, backend, or database.

## Verification

- Update document composer tests to assert the sequence badge, kind, avatar, name, seal slot, remove action, muted chip surface, and absence of department text.
- Keep existing tests for approval order, agreement grouping, stage deletion, renumbering, candidate restoration, and selector/action sizing passing.
- Inspect the document composer at 375px, 768px, and 1280px widths; verify the stage content remains a single line and only the approval strip scrolls when needed.
- Run the focused document composer tests, lint changed frontend sources/tests, and the frontend production build.
- Update the dated direction, plan, specification, and result report with the revised chip appearance and browser evidence.

## Alternatives considered

1. **One muted chip per committed stage (selected):** matches the supplied reference, keeps role and participant identity together, and avoids visual clutter.
2. **Separate nested chips for every element:** more visually segmented but crowded at the existing 40px height.
3. **White card with only sequence/kind badges tinted:** preserves the previous card emphasis but does not provide the requested gray chip appearance.
