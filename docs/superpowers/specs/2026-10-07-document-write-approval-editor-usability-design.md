# Document Write Approval and Editor Usability Design

## Problem

The document composer currently repeats selected approval and reference recipients below their multi-select fields. Approval insertion only accepts one person at a time, and approval stages consume vertical space. The rich-text editor has a bounded content surface with its own vertical scroll, separating long body editing from the modal's surrounding fields.

## Options considered

1. **Extend the shared user selector with opt-in behavior (recommended).** Add optional selected-option filtering and selected-value order preservation to the existing `UserSelectEditor`, enabled only in the document composer. This reuses the established F1 user UI and leaves other consumers unchanged by default.
2. **Build a document-only user picker.** This enables local behavior but duplicates shared selection, avatar, and search behavior.
3. **Only remove recipient summaries.** This is a smaller change but does not reliably hide selected candidates or preserve multi-user approval order.

Use option 1. The rich-text editor remains the shared editor; only the document-composer layout and its content sizing/overflow change.

## Approved behavior

### Approval and reference selection

- A selected user remains visible as a chip inside its selector, but disappears immediately from that selector's dropdown candidates.
- Users already present in approval or agreement stages are excluded from the approval selector, preventing a person from being added to that line twice.
- The approval and reference lines remain independent; do not add a cross-line duplicate restriction.
- Selecting multiple approval users preserves their selection order. Clicking **결재 추가** creates one approval stage per selected user in that order, appends the stages to the existing line, and clears the selector.
- **합의 추가** keeps the existing contract: all currently selected users become one agreement stage. It then clears the selector.
- The selection buttons sit to the right of the approval selector. Added stages flow horizontally with stage numbers and `>` separators. A narrow viewport may scroll the stage strip horizontally inside its own bounded region instead of widening the page.
- Remove the separate recipient summaries below both selectors. Keep the existing recipient avatars/names/departments inside stage cards.

### Editor and modal scrolling

- Keep the shared `RichTextEditor` and `CommonDialog`.
- Let the editor content surface grow with its document, retaining a sensible minimum height but removing its fixed maximum height and internal vertical scrolling.
- Remove fixed-height/overflow constraints in the composer body that prevent the content from contributing its natural height.
- Use the existing bounded `CommonDialog` content area as the vertical scroll container so long forms and editor content can be reached together. Keep the modal header/footer behavior and horizontal overflow protections.

## Boundaries

- Add selector props as opt-in behavior with defaults preserving all other `UserSelectEditor` consumers.
- Keep changes in the frontend, document composer tests, and the 20261007 task/design/result documentation and screenshots.
- Do not add submission, saving, approval execution, backend/API, or cross-line recipient validation behavior.

## Verification

- Add regression coverage for immediate selected-option hiding, selected order, sequential multi-approval stages, unchanged grouped agreement behavior, no duplicate reference summary, and composer reset behavior.
- Verify editor content can grow and the composer content container scrolls rather than the editor surface.
- Run the focused document-write Vitest file and frontend production build.
- Inspect 375px, 768px, and 1280px browser layouts, including horizontal stage-strip behavior and long editor content. Save screenshots and record measured observations in the result report.
