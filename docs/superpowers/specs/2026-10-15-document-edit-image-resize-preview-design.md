# Document Edit Image Resize Preview Design

## Problem

When editing an approval document, protected embedded-image URLs are fetched as authenticated Blobs and applied to the rendered `<img>` elements as temporary object URLs. The ProseMirror document model intentionally retains each persisted approval-image URL so saved HTML and JSON do not contain temporary Blob URLs.

Resizing an image updates its `width` and `height` attributes through TipTap. ProseMirror then renders a new image element from the document model, restoring the protected URL as `src`. The browser's unauthenticated image request fails and the resized image appears broken.

## Approved design

Keep the existing separation between persisted image attributes and temporary preview URLs. In the document-edit image hydration effect, retain a mapping from each protected approval-image URL to its fetched object URL. Subscribe to editor document updates and reapply the mapped preview URL to newly rendered `<img>` elements whose model `src` is a mapped protected URL.

Register the update listener before asynchronous Blob requests can complete. Remove the listener during effect cleanup, restore original URLs on still-mounted preview elements where applicable, and revoke every created object URL using the existing lifecycle.

Do not update image `src` in the ProseMirror model. The current save snapshot should therefore continue to serialize the canonical approval-image URL, with the resized width and height, and no Blob URL. Do not change API calls, image metadata, document detail rendering, new-image upload behavior, or shared resize calculations.

## Verification

Add a document-composer regression that loads an existing protected embedded image, simulates a resize that updates the image node attributes, and verifies:

- the image still renders from the Blob preview after the editor re-renders it;
- the resized dimensions remain in the document model;
- saving preserves the original approval-image URL and dimensions without persisting a Blob URL.

Run the focused document-write test, frontend build, Problems diagnostics, and `git diff --check`. Browser validation must not bypass authentication; record a login redirect if the edit composer cannot be opened.
