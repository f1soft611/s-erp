# Comment Attachment Order and Theme-Safe Image Viewer

## Goal

Show comment image previews before the attachment file list and ensure clicked images remain visually faithful in both light and dark themes.

## Scope

- Comment and reply image previews in document-writing and notice feeds
- The shared image viewer used by comment and feed-body image previews
- Frontend component tests and browser verification

Comment image previews remain separate from the attachment list. This change does not alter upload, download, deletion, comment permissions, API contracts, or database schema.

## Approved behavior

- Comment content is followed by the image preview strip, then the attachment file list.
- Image previews and attachment rows each retain their existing attachment order.
- The shared image viewer does not apply color inversion, brightness, or other pixel-altering filters.
- The viewer uses a neutral checkerboard image canvas so transparent areas remain discernible regardless of theme.
- Images preserve their intrinsic aspect ratio and fit within the available viewport without cropping.
- Viewer chrome follows the active application theme instead of forcing a fixed dark palette.
- The shared viewer behavior applies consistently to document and notice comment images as well as feed-body images.

## Approach

Update the common comment rendering order and the shared `ImageViewerDialog`. Keep authentication, Blob creation, preview URL lifetime, and click callbacks in their current page-level flows.

For the viewer, retain the image as an unmodified `<img>` and provide a checkerboard only on the canvas behind it. Use theme-aware surface and text colors for the dialog chrome. Bound the image by viewport dimensions and use `object-fit: contain`.

## Alternatives considered

- **Theme-specific solid canvas:** simpler, but transparent pixels may blend into the selected light or dark background.
- **CSS image filters in dark mode:** rejected because filters alter source colors and can make stamps or scanned documents appear damaged.
- **Selected approach — neutral checkerboard canvas:** distinguishes transparent regions while preserving the source image's color values.

## Error handling and compatibility

- Existing image loading errors, attachment downloads, preview failures, and object URL cleanup remain unchanged.
- Images that cannot be previewed continue to show the existing error state; the attachment row remains available.
- No API or database changes are required.

## Verification

- Component tests verify that the preview strip appears before the attachment list and that both retain their established ordering.
- Viewer tests verify the image source is passed through unchanged, fits without cropping, and has no pixel-altering filter.
- Existing document and notice comment image tests continue to pass.
- Build the frontend and inspect the shared viewer in light and dark themes at 375px, 768px, and 1280px widths.
