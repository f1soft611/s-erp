# Document Write Detail Feed Design

## Goal

Show every document returned by the active document-writing filters as a
notice-style feed entry containing the full document detail, attachments,
comments, and the existing like control. Keep approval processing in the
existing right-side detail panel.

Keep the list view and its detail-panel behavior. When editing from the detail
panel, show the composer above it; closing or saving the composer refreshes the
list and selected detail quietly without replacing them with loading skeletons.
Switching between feed and list always reloads the data and shows that view's
skeleton while the request is in progress.

## Scope

- In feed mode, render all documents returned by the active scope and document
  kind filters as complete document feed cards, including pinned documents
  when present in those results.
- Reuse document-detail data, attachments, comments, and existing reaction
  behavior rather than notice APIs or notice permissions.
- Keep the existing like behavior: the control toggles locally and its displayed
  count remains zero; no document like persistence API is introduced.
- Do not show approval, rejection, or revision-request actions in feed cards.
  Those actions remain in the existing detail panel opened from list mode.
- Keep list selection, document filters, scope selection, and current
  document-specific labels and permissions.
- Keep the detail panel open behind the composer and refresh updated content
  quietly when the composer closes or saves.
- Extend only the existing document-list API response when explicitly asked for
  feed details. Do not change the database schema or notice behavior.

## Design

### Feed cards

Use the existing document detail behavior as the source of truth for each
feed card. The card includes the document title, author and date, kind/status,
full rich-text body with authenticated embedded images, attachments, the
existing like/bookmark controls, and threaded comments with their current
create, reply, edit, delete, attachment, and previous-comment behavior.

The feed renders every record returned by the current scope and kind filters.
If pinned records are returned, they remain represented as full detail cards
in the existing pinned ordering rather than being omitted or reduced to title
summaries. Feed mode does not open the right-side detail panel when the user
interacts with a card. List mode continues to open that panel when an item is
selected.

On each view-mode switch, reload the filtered document list and show the
corresponding feed or list skeleton until that view's data is ready. List mode
uses the existing lightweight list response. Feed mode requests
`includeDetails=true` from the existing document-list endpoint; its response
adds the complete feed payload to each matching document. Preserve the
document's existing permission-gated edit/delete menu in feed cards, following
the notice feed's owner-menu pattern. Editing from a feed card opens the
composer and quietly refreshes the list and feed details when it closes.
Editing from the list detail panel keeps that panel open beneath the composer
and quietly refreshes the selected detail. Do not add notice-only pin actions
or new document actions that have no existing document service.

The detailed list response includes the fields required by the existing
document detail presentation: the full body, approval-line data, attachments,
and the initial user-comment page with its attachments, count, and previous
comment cursor metadata. Older comments continue to use the existing paged
comment API. The backend assembles this payload without recording a document
view or incrementing its view count; the existing detail endpoint retains its
current view-count behavior.

The complete feed payload is returned by one list request and replaces the
feed only after the response is complete. The list endpoint keeps its existing
response shape unless `includeDetails=true` is requested. Reuse the current
document detail presentation for panel and feed behavior; feed cards consume
their preloaded detail/comments instead of issuing one detail/comment request
per card. Continue using existing services for older-comment paging and
comment/attachment mutations. The feed presentation omits
approval-processing controls; those remain available only in the detail panel.
Feed cards do not reuse notice APIs, data, or permissions.

When details are requested, each result row keeps all existing list fields and
adds `contentsJson`, `contentsHtml`, `contentsText`, `viewCount`, `isDrafter`,
`draftingWorkCategoryId`, `approvalLines`, `attachments`, `systemEvents`,
`comments`, `commentCount`, `hasPreviousComments`, and
`nextBeforeCommentId`. `comments` contains the existing initial page of user
comments, including each comment's attachments; older comments remain
available through the existing cursor-based comment endpoint. The existing
response remains unchanged when `includeDetails` is omitted or false.

### Editing from document detail

Selecting the existing edit action opens the composer over the detail panel
without clearing the selected document ID. Closing or saving the composer
leaves the panel open.

When the composer closes, refresh the document list and summary quietly and
request the selected detail again while retaining its current content. Replace
the detail only after a successful response. A failed list or detail refresh
must remain visible through the existing error presentation; it must not be
treated as success or close the panel.

## Alternatives considered

1. **Add optional details to the existing list endpoint (selected).** This
   matches the notice list's one-response feed data flow, keeps the current
   lightweight list response as the default, and avoids a new endpoint.
2. **Add a dedicated document-feed endpoint.** This separates feed and list
   contracts but creates another endpoint with overlapping filtering and
   document metadata.
3. **Fetch each document's detail and comments from the frontend.** This
   avoids a backend response change, but it is not a single list request and
   causes request volume to grow with the number of documents.

## Error handling

- A failed detailed-list request does not render a success-shaped partial
  feed; the view shows the request error and keeps the existing data state
  available for retry.
- Existing document comment and attachment errors continue to use their
  current notifications/error messages.
- Quiet list/detail refresh failures remain visible without clearing the
  selected detail panel.
- Existing composer save errors and document permission checks are unchanged.

## Verification

- Test that all filtered records are rendered as feed cards and that each card
  supports full detail, existing like toggle, comments, and attachments.
- Test that feed interactions do not open the detail panel and that list
  selection still opens it.
- Test that mode switches refetch, show the correct skeleton, and ignore stale
  responses; test that feed cards render together only after the detailed-list
  response succeeds.
- Test that detailed-list failure is explicit and does not render partial feed
  cards, while older comments still load through the existing paging API.
- Test that approval-processing actions are absent from feed cards and remain
  available in the detail panel.
- Test that editing leaves the detail panel mounted and that close/save
  refreshes list and detail without loading skeletons.
- Run focused frontend tests and the production build.
- Verify browser layouts at 375px, 768px, and 1280px and save screenshots in
  the dated result folder.
