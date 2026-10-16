# Draft form template dialog body scroll design

## Purpose

Remove the top and bottom separator lines around the draft-form template editor
and make the full dialog body the vertical scroll region, while keeping the
dialog consistent with the document and notice composer dialogs.

## Current structure

- `DraftFormTemplateDialog` already uses the shared `CommonDialog` shell used by
  the document and notice composer dialogs.
- The rich-text editor currently has its own vertical scroll region inside a
  bordered editor frame.
- `CommonDialog` provides a scrollable body with a fixed header and optional
  fixed footer; the template dialog puts its editing toolbar in the footer.

## Approaches

### A. Keep the shared shell and move scroll ownership to its body (selected)

Remove the editor frame's top and bottom borders and let the `CommonDialog`
body own vertical scrolling. Apply any editor sizing/overflow adjustment only
to the template-dialog use so other rich-text editor screens keep their current
scroll behavior.

### B. Change shared dialog scrolling and separators

Changing the shared shell would affect every consumer, including document and
notice composition, and could remove dividers or alter scroll behavior outside
the requested screen.

### C. Rebuild the template dialog with a screen-specific modal

This would duplicate the shared header, body, and footer structure already used
by document and notice composition.

## Approved design

Use approach A. Keep `CommonDialog`, its common header/footer structure, the
template toolbar slot, and save/cancel actions. The dialog title and footer
remain fixed while the entire template editing body scrolls as one region.
Remove only the editor frame's top and bottom separator lines; retain the
shared shell's own header/footer separators and preserve the editor's existing
formatting, clipboard, image-upload, save, and unsaved-change behavior.

If the shared rich-text editor needs a layout option to allow its content to
grow with the dialog body, scope that option to `DraftFormTemplateDialog` and
leave all existing consumers on their current behavior.

## Verification

- Update the focused template-dialog test to verify the editor frame has no
  top/bottom border and that vertical scrolling belongs to the dialog body,
  not a nested editor viewport.
- Run the focused template-dialog tests and the frontend build.
- Inspect the rendered dialog at 375px, 768px, and 1280px; verify the header and
  footer remain fixed while long content scrolls through the body.
- Record browser verification and screenshots, when available, in the dated
  result folder.
