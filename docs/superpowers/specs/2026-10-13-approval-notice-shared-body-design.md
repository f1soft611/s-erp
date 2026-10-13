# Shared Notice and Approval Detail Body Design

## Goal

Make the electronic-approval detail use the same body presentation and
interaction as the notice feed, and correct approval-line and previous-comment
parity. Keep domain data loading, authorization, and mutations in their current
feature services.

## Observed gaps

- Approval detail replaces stored embedded-image nodes with text references,
  then renders a separately titled thumbnail section. Notice instead removes
  images from collapsed rich text, shows untitled thumbnails, and renders the
  hydrated image in the expanded body.
- Approval body expansion uses a plain-text-versus-summary comparison and a
  fixed-height clip. Notice uses the body/summary distinction and shared rich
  text/preview conventions.
- Approval-line cards do not use the composer grid's position, seal, and
  sequence/name rows, and the line block has no trailing divider.
- Approval detail requests 20 comments initially and displays all returned
  records. For documents with fewer than 20 comments this leaves no older
  cursor page, whereas notice initially displays the latest three and exposes
  the older-comments affordance when more exist.

## Design

### Shared body presentation

Extract a presentational `FeedBodyContent` component under
`frontend/src/shared/components/feed/`. It receives preprocessed collapsed and
expanded HTML, a summary/body distinction, expanded state and toggle callback,
embedded-image previews, loading/error state, and image-open callback. It owns
the shared typography, rich-text clipping, expand/collapse control, image
preview row, and accessible image interaction. It does not fetch images or
interpret notice/approval API records.

Refactor `NoticeFeedList` to consume this component without changing its
existing collapsed summary, image hydration, expand-state ownership, or image
viewer behavior. Refactor `DocumentApprovalDetailFeed` to supply sanitized
content and authenticated embedded-image Blob URLs. The approval body must
retain real `<img>` elements with hydrated sources in expanded HTML; never
replace them with visible `[본문 이미지 ...]` text. In collapsed mode, omit
inline images from the rich-text excerpt and show the same untitled thumbnails
as notice. Remove the separate `본문 이미지` heading and duplicate image
presentation.

### Approval-line presentation

Keep approval data and ordering in the approval feature. Render read-only
participants with the same three-row grid geometry as the composer
(`32px 64px 32px`): department/position metadata, status/seal area, then
sequence and participant name. Render actual participants only. Keep
agreement and reference rows aligned with the composer conventions. Add a
divider after the complete approval/agreement/reference block and before the
document title/body. No interaction or workflow transition is introduced.

### Previous comments

Show the latest three approval USER comments on initial load, matching the
notice detail's initial timeline density. Request three records for the first
page and use the existing cursor/`hasPrevious` contract. Request up to 20
records for each older page and prepend them while preserving timeline sort,
system-event merge, and the current error/loading UI. Keep comment count and
reply behavior unchanged.

### Boundaries and failures

- Shared body components are presentational; feature code owns sanitization,
  authenticated image fetches, Blob URL lifecycle, state, errors, and viewers.
- Image-fetch failures remain explicitly visible and do not render textual
  image placeholders.
- Existing notice pagination and image hydration remain unchanged.
- Approval comment API, permissions, reply/edit/delete, and system timeline
  behavior remain unchanged.
- No backend, API contract, or database changes.

## Alternatives

1. Patch approval detail independently. This is narrower, but duplicates body
   behavior and would continue drifting from notice. Not selected.
2. Extract a shared body presentation and migrate notice and approval to it.
   This directly enforces the requested notice parity while leaving data and
   image-fetch responsibilities feature-owned. Selected.
3. Build a universal feed component that also owns domain data and image
   loading. This would couple unrelated APIs and permissions. Not selected.

## Verification

- Add component tests for collapsed/expanded rich and plain bodies, untitled
  image previews, image-open callbacks, and accessibility.
- Verify notice body behavior remains unchanged after migration.
- Add approval tests for composer-aligned participant slots, the trailing
  divider, real inline embedded images, no textual image placeholders or
  preview heading, initial three-comment page, and older-page prepend.
- Run focused notice/approval Vitest suites and the production build.
- Verify browser rendering and horizontal overflow at 375px, 768px, and
  1280px; save screenshots and update the dated result report.
