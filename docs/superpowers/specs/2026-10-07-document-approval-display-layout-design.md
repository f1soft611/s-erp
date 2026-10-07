# Document Approval Display Layout Design

## Status

Approved in conversation on 2026-10-07. This design supersedes [Document Approval Participant Chip Design](./2026-10-07-document-approval-chip-style-design.md), which described a single gray chip for each approval stage. The earlier direction to use that one-chip layout is no longer current.

## Goal

Separate document-composer approval input from the committed approval display, show approvals as a wrapping approval-table grid, show agreement participants as wrapping compact chips, and retain the current reference row.

## Layout

Render the controls in this order, each as a labeled row:

1. **결재선** — the current multi-user selector followed by `결재 추가` and `합의 추가` buttons. This row is for choosing users and committing them; committed participants are not rendered inline here.
2. **결재** — display confirmed approval users as table-like columns. Each participant column contains a position/title cell, a stamp/signature area, and a lower sequence-number/name row, following the supplied third image. Include a remove (`X`) action in each column so a committed participant can be removed individually. Keep participants in their existing approval order. When the row runs out of available width, continue on the next line in the same order; do not create page-level horizontal overflow.
3. **합의** — display each confirmed agreement participant as an individual compact chip following the supplied second image. A chip contains only the global approval sequence number, participant name, seal placeholder, and an individual remove (`X`) action. Do not show avatar or stage-kind text in these chips. Wrap chips to additional lines when necessary.
4. **참조** — retain the existing reference selector row and behavior unchanged.

Keep the labels in a consistent left column and the content in a min-width-safe right column. Empty committed approval/agreement sections should not create misleading participant rows.

## Ordering and stage behavior

- Preserve the active multi-user selection, selection order, `결재 추가`, `합의 추가`, and candidate filtering behavior.
- The approval grid shows each committed `approval` participant in approval-stage order.
- Agreement display flattens participants from committed agreement stages in their existing order, but renders a chip per participant.
- Number committed participants by their global approval order, including both approval and agreement participants. If a preceding participant is removed, renumber the remaining visible participants.
- Removing an approval participant removes its approval stage. Removing a participant from an agreement chip removes only that participant from the agreement group; when its last participant is removed, remove the now-empty stage.
- Removed participants return to the approval selector candidates. Reference selections remain independent.

## Accessibility and presentation

- Keep meaningful row labels (`결재선`, `결재`, `합의`, `참조`) and accessible controls.
- Each approval table column identifies its participant and sequence for assistive technologies and has a remove button naming that participant and sequence.
- Each agreement chip has accessible sequence/name content and a remove button naming the participant and sequence.
- Keep the approval table columns compact with visible neutral borders and the signature area clearly distinguishable. Keep agreement chips muted and compact, visually similar to the supplied reference.

## Scope

- Update `DocumentApprovalFields`, the existing composer stage-removal wiring if needed for individual agreement removal, focused composer tests, and dated requirement/result documents.
- Keep the shared `UserSelectEditor`, composer APIs, form/editor behavior, routes, backend, and database unchanged.
- Do not change reference selection behavior.

## Verification

- Test the four row order and labels, approval-table order/position/name/sequence, wrapping-ready layout styles, agreement chip contents and individual removal, global renumbering, candidate restoration, and unchanged reference behavior.
- Run focused composer and user-selector tests, changed-file lint, and the frontend production build.
- Inspect 375px, 768px, and 1280px browsers. Verify table cells and agreement chips wrap instead of widening the page, preserve sequence order, and keep the reference field usable.
- Capture only privacy-safe synthetic content in result screenshots.

## Alternatives considered

1. **Wrapping approval-table grid plus wrapping agreement chips (selected):** directly follows both supplied references and avoids horizontal overflow on narrow screens.
2. **Scrollable approval table plus wrapping agreement chips:** preserves a single table row but hides later approvers on narrow screens.
3. **One uniform chip layout for both kinds:** simplest, but loses the requested approval-table treatment.
