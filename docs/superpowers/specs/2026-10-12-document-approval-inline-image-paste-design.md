# Document Approval Inline Image Paste Design

## Problem

The document composer uses the shared `RichTextEditor`, whose image-paste
handler intentionally prevents the browser's default paste behavior and only
inserts an image when an `uploadImage` adapter is provided. The composer does
not provide that adapter, so pasted clipboard images are discarded. The shared
frontend image lifecycle and backend embedded-image storage/document processor
already exist, but the approval draft flow is not connected to them.

## Approved behavior

- Pasting a supported clipboard image into an editable approval draft uploads
  it as a temporary embedded image and inserts its preview into the body.
- Saving the draft validates image references against the current temporary
  upload session and images already owned by that approval.
- Valid temporary images referenced by the saved HTML/JSON are promoted to
  permanent `APPROVAL`-owned embedded images in the same approval save
  transaction. Saved body HTML/JSON use stable, authenticated image URLs.
- Images removed from the body are no longer retained by that approval and are
  cleaned up after a successful save. Unreferenced temporary uploads are also
  cleaned up after save or when the composer is discarded.
- Image upload failure is visible in the composer and prevents saving while an
  image upload is in progress. Existing attachment behavior remains separate.
- Image retrieval checks the authenticated draft owner, tenant, approval ID,
  and embedded file ownership before streaming.
- No new image table is introduced; use existing common file metadata and
  storage infrastructure.

## Architecture and data flow

1. `DocumentComposerDialog` wires the existing
   `useRichTextEditorSaveLifecycle` to a thin approval-specific temporary image
   upload/delete API adapter and passes its callbacks to `RichTextEditor`.
2. The shared lifecycle tracks temporary upload tokens, referenced images,
   pending upload count, and orphan cleanup. The draft request includes the
   existing body HTML/JSON plus referenced-image and temporary-upload metadata.
3. Approval-scoped temporary upload/delete routes delegate to
   `EmbeddedImageStorageService`; they do not create approval-owned metadata
   before a draft exists.
4. `DocumentApprovalServiceImpl` reuses `EmbeddedImageDocumentProcessor` with
   owner type `APPROVAL`. New-draft creation obtains the approval ID before
   processing and persists rewritten HTML/JSON within the existing transaction;
   updates process against their existing ID. Any failure rolls back document,
   line, event, and image metadata changes together, with permanent object
   cleanup handled by the common storage service.
5. An approval image read route delegates to `streamOwnedImage` only after
   verifying that the caller can access the draft. Its stable URL is written
   by the approval URL resolver.

## Alternatives considered

- **Reuse the shared lifecycle and processor with approval-scoped API adapters
  (selected):** keeps paste mechanics, validation, image promotion, metadata,
  cleanup, and sanitization common while keeping approval authorization and
  stable URLs in the approval domain.
- **Call the notice image endpoint from approval:** reuses temporary storage
  but couples approval UI to a notice-specific API path and obscures ownership.
- **Insert local/base64 images without server promotion:** appears simpler but
  does not reliably persist, secure, or clean up body images and conflicts with
  the editor's `allowBase64: false` policy.

## Boundaries

- Do not change the shared editor's paste semantics for other consumers.
- Do not change approval-line, system-comment, or regular attachment behavior.
- Do not introduce a DB schema change; verify the existing common-file owner
  and `EMBEDDED` metadata contract before implementation.
- Saved draft visibility is limited to the authenticated draft owner, matching
  the current draft authorization contract. Access rules for submitted/approved
  documents remain outside this change.

## Verification

- Add an approval-composer regression test proving a clipboard image calls the
  approval temporary-image adapter and renders the uploaded preview.
- Verify upload failure and in-progress upload prevent draft save and show the
  expected error/progress feedback.
- Verify save requests carry HTML/JSON and image reference/session metadata.
- Backend tests cover temporary upload/delete authentication, draft-owner image
  retrieval, image promotion and stable URL rewriting for create/update, image
  removal cleanup, and transaction rollback on processor/save failure.
- Run focused frontend and backend tests and their normal build checks.
- Verify browser paste, save, and image rendering at 375px, 768px, and 1280px;
  save screenshots under `docs/result/20261012/document-inline-image-paste/`.
