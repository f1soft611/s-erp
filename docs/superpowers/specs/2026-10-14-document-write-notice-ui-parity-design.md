# Document Write Notice UI Parity Design

## Goal

Align the document-writing page's feed presentation and edit-modal behavior with
the existing notice UI while preserving document-specific data, permissions,
and approval workflows.

## Scope

- Match the document feed card layout, spacing, and responsive behavior to the
  notice feed's shared presentation components.
- Make feed cards expand inline instead of opening the right detail panel.
- Keep list-row selection opening the existing right detail panel.
- Keep the right detail panel open behind the edit dialog and refresh updated
  content without showing a full-page or panel loading skeleton.
- Do not change document APIs, backend behavior, database schema, permissions,
  comments, or approval actions.

## Design

### Feed and list presentation

Keep the page's list/feed toggle and its existing default list mode. In feed
mode, retain the document-specific card and its approval-status and document
kind labels, but compose it with the shared notice feed primitives and
presentation spacing (`FeedView`, `FeedCard`, and `FeedBodyContent`).

Clicking the inline expansion control loads a document's full contents from
the existing detail API when they are not already available, then expands the
body in the feed card. Cache fetched content by document ID while the page is
mounted. Keep the summary as the collapsed preview. Show an inline loading
state while retrieving the body and an explicit error with a retry path if
retrieval fails. Feed card interactions must not open the right detail panel.

In list mode, preserve the existing list item content and behavior: selecting
an item opens the right detail panel. Keep the pinned-document panel and
current document-specific labels in both modes.

### Editing from document detail

When the user selects the existing edit action from the detail menu, open the
document composer over the detail panel without clearing the selected
document ID. Closing or saving the composer leaves the panel open.

Refresh the document list/summary and the currently selected detail quietly
after the composer closes, retaining the current content while requests run
and avoiding the page or panel loading skeleton. Replace the detail content
when the refresh succeeds. Surface list or detail refresh failures using the
existing error presentation; do not treat a failed refresh as success.

### Boundaries and compatibility

- Reuse shared visual components; do not reuse notice data loading, APIs,
  reactions, comments, or permissions for documents.
- Keep approval status and document type visible on feed cards.
- Preserve existing list selection, detail actions, and composer save/cancel
  behavior.
- Do not add backend/API/DB changes.

## Alternatives considered

1. Use the complete notice feed component for documents. Rejected because it
   would import notice-only reactions, comments, permissions, and mutations.
2. Keep a separate document card and copy notice markup/styles. Rejected
   because copied layout would drift from the shared notice presentation.
3. Keep a document-specific card and compose it from the shared presentation
   primitives. Selected because it aligns the UI while preserving document
   behavior and avoids feature coupling.

## Error handling

- A failed lazy detail fetch leaves the collapsed summary available and
  exposes an inline error and retry action.
- Failed background list or detail refreshes remain visible through the
  existing page/panel error UI; the current detail panel stays open.
- Existing composer save errors and document permission checks are unchanged.

## Verification

- Add or update tests for inline feed expansion, detail-fetch loading/error/
  retry behavior, and the guarantee that feed clicks do not open the panel.
- Verify list selection still opens detail and edit leaves detail mounted
  beneath the composer.
- Verify close/save refresh does not show full loading skeletons and that
  refreshed detail content is displayed.
- Run focused frontend tests and the production build.
- Check browser rendering at 375px, 768px, and 1280px and save screenshots
  under the dated result folder.
