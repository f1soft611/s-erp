# Document Composer Editor Fill-Height Design

## Status

Approved by the user on 2026-10-07.

## Goal

When the document composer opens, its body editor should occupy the available vertical space below the title, approval/reference rows, and document metadata instead of opening at its current 180px minimum height.

## Approved behavior

- The editor fills the remaining height inside the document composer modal after its preceding fields are laid out.
- Keep a sensible minimum editor height on short viewports; do not force an editor-sized viewport-height block that pushes all preceding fields out of view.
- As body content exceeds the initial available height, the editor content may grow naturally and the `CommonDialog` content region remains the vertical scroll container.
- Keep the visible top and bottom whitespace inside the editor equal for every selected template. Normalize only the first block's outer top margin and the last block's outer bottom margin so template block margins do not make the editor edge spacing asymmetric.
- Preserve the modal's fixed header/footer behavior, existing rich-text toolbar and content behavior, and all approval/reference fields.
- Apply the sizing change only to the document composer. Other `RichTextEditor` consumers and default `CommonDialog` behavior remain unchanged.
- At narrow widths/fullscreen mobile layouts, the editor fills the remaining modal content area and the modal body remains vertically scrollable.

## Design

Keep the shared `RichTextEditor` and constrain the change to `DocumentComposerDialog`. Make the composer content and editor panel a min-height-safe vertical flex layout. Let the editor panel grow to use remaining space while retaining its minimum height. Keep the rich-text document surface free of a fixed maximum height and internal vertical scrolling so long content remains part of the modal's scrollable document flow.

Use the existing `CommonDialog` `bodyMode="fill"` content region as the sizing boundary. Do not introduce viewport-height calculations or editor-specific scroll containers.

## Scope

- Update the document composer editor layout and focused tests, including template edge-spacing coverage.
- Update the dated document-write requirement, plan, specification, and result evidence to describe the fill-remaining-height behavior.
- Do not change shared editor defaults, API/data contracts, backend, database, routes, or unrelated modal layouts.

## Verification

- With a newly opened composer, verify the editor fills the available height below the preceding fields and is not limited to the old 180px initial surface.
- Select a template that starts with a block having a default top margin and verify the first and last block outer margins are normalized while the editor's top/bottom padding matches.
- At 375px, 768px, and 1280px widths, verify the composer has no page-level horizontal overflow and its body owns vertical scrolling.
- Add long body content and verify it remains reachable by scrolling the modal content while the dialog header/footer stay accessible.
- Run focused composer tests, frontend lint for changed source/tests, and the production build.
