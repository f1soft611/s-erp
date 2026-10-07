# Document Composer Dark Agreement and Editor Surfaces Design

## Problem

The shared document composer uses a theme-aware dialog surface, but agreement
participant chips still use fixed light gray palette entries and therefore
remain bright in dark mode. The editor surface must also follow the active
theme rather than forcing a white canvas in dark mode.

## Approved approach

- Keep the existing light-mode agreement chip appearance. In dark mode, use a
  subdued slate chip surface, theme divider border, and theme-readable text.
- Use a white editor canvas in light mode and match the common dialog body
  surface (`#1e293b`) in dark mode. Apply the selected surface consistently to
  the editor panel, editable area, and attachment area.
- Use theme `text.primary` for default editor body text and the same muted
  `text.disabled` color as the title placeholder for the body placeholder.
- Keep the title input bold (`700`) and editor body text regular (`400`) by
  default. Preserve user-applied rich-text formatting.
- Keep the dialog shell and title field surfaces themed as before.
- Add focused regression tests for agreement chip colors and the dark-mode
  composer editor surface. Preserve unrelated approval-line work already in
  the shared worktree.

## Alternatives considered

1. **Theme-aware agreement chips and editor surfaces (selected):** use white in
   light mode and the common dialog body surface in dark mode, keeping editor
   text readable in both.
2. **Use a separate, darker editor-only surface in dark mode:** distinguishes
   the canvas from the dialog body but does not match the shared modal surface.
3. **Use a white editor canvas in every theme:** keeps a paper-like canvas but
   conflicts with the explicit requirement that the editor follow the active
   theme.

## Scope

- Update agreement chip styling in `DocumentApprovalFields`.
- Update editor canvas, default text, and placeholder colors in the document
  composer theme handling.
- Add focused automated regression coverage and update dated task/result docs.
- Do not change agreement selection data flow, approval behavior, shared dialog
  surfaces, the title field, APIs, or existing collaborator changes.

## Verification

- Light agreement chips retain their existing gray surface.
- Dark agreement chips use a dark slate surface and remain legible.
- The editor canvas is `#ffffff` in light mode and `#1e293b` in dark mode;
  default text and placeholder remain legible against each surface.
- The body placeholder matches the title placeholder's muted theme color; title
  text is bold and the default editor body is regular.
- Run focused tests, lint, build, and shared-browser checks at 375px, 768px,
  and 1280px. Avoid exposing personal/document content in screenshots.
