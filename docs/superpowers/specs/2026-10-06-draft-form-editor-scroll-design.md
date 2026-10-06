# Draft form editor scroll alignment design

## Context

The draft-form template dialog currently places `overflow: auto` and padding on
the box surrounding `RichTextEditor`. The notice composer instead clips the
editor frame and lets the `.ProseMirror` content area scroll. This difference
leaves the draft-form scrollbar inset from the editor frame and makes the
scrolling region feel separated from the top of the editor.

## Goal

Make the draft-form editor scrollbar start at the top edge of its editor area,
matching the notice composer, while preserving padding between the document
content and the editor boundaries.

## Approaches

1. **Move scrolling to `.ProseMirror` (recommended):** Keep the dialog-specific
   change in `DraftFormTemplateDialog`; make the outer editor frame clip overflow
   and set scroll behavior and padding on the editor content. This matches the
   notice composer without changing shared editor behavior.
2. **Only remove the outer padding:** This may reduce the visible gap but leaves
   scroll ownership different from the notice composer and does not ensure the
   scrollbar aligns to the editor frame.
3. **Change `CommonDialog` or shared editor defaults:** This could affect all
   rich-text dialog consumers and is broader than the reported issue.

## Chosen design

Apply approach 1 only to the draft-form template dialog. The bordered editor
frame will remain the visual boundary and will not scroll. The `.ProseMirror`
content area will own vertical and horizontal scrolling, with the current
content inset retained as editor padding. Loading, error, save, toolbar, image,
and unsaved-change behavior remain unchanged.

## Verification

- Add or update a focused dialog test to verify the scroll styles belong to the
  ProseMirror content and the editor frame clips overflow.
- Run the focused draft-form dialog tests and the frontend build.
- Inspect the dialog in a browser at desktop and narrow/mobile widths to confirm
  the scrollbar begins at the editor top and content padding remains visible.
