# Document Write Detail Feed Design

## Goal

Show every document returned by the active document-writing filters as a
notice-style feed entry containing the full document detail, attachments,
comments, and the existing like control. Keep approval processing in the
existing right-side detail panel.

Keep the list view and its detail-panel behavior. When editing from the detail
panel, show the composer above it; closing or saving the composer refreshes the
list and selected detail quietly without replacing them with loading skeletons.

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
- Do not change backend APIs, database schema, or notice behavior.

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

Reuse the current document detail implementation and services to avoid
duplicating comment permissions and mutations. Adapt its presentation boundary
so the same document-specific behavior can render inline as a feed card or in
the existing side panel. The feed presentation omits approval-processing
controls; those remain available only in the detail panel. Feed cards do not
reuse notice APIs, data, or permissions.

Render each card shell immediately, then load its detail and initial comments
as it enters the viewport. This keeps the complete filtered feed visible while
avoiding a burst of detail/comment requests for off-screen records. Provide
card-scoped loading, explicit errors, and retry for failed requests. Continue
using the existing document detail service and paged comment service.

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

1. **Reuse document detail behavior in inline cards (selected).** This
   preserves existing document permissions, comment mutations, attachment
   handling, and reaction behavior while avoiding notice/document coupling.
2. **Build a separate document feed implementation from notice primitives.**
   This would keep the page visually familiar but duplicate document comment
   behavior and risk divergence from the detail panel.
3. **Keep summary-only cards and open detail on selection.** This has the
   smallest implementation cost but does not satisfy the requested full-detail
   feed.

## Error handling

- Detail and comment requests show card-scoped loading and errors with an
  explicit retry action.
- A failed detail request does not render a success-shaped partial document;
  the card retains its available list metadata and reports the failure.
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
- Test per-card loading, request failure, retry, and off-screen request
  deferral.
- Test that approval-processing actions are absent from feed cards and remain
  available in the detail panel.
- Test that editing leaves the detail panel mounted and that close/save
  refreshes list and detail without loading skeletons.
- Run focused frontend tests and the production build.
- Verify browser layouts at 375px, 768px, and 1280px and save screenshots in
  the dated result folder.
