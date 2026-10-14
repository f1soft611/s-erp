# Feed Detail UI Parity Design

## Goal

Keep notice and electronic-approval detail panels visually consistent while
improving the requested loading, body, system-event, reply-toggle, and divider
behaviors.

## User-approved behavior

- Center the detail-loading spinner both vertically and horizontally in the
  available shared detail-panel content area. Apply it to notice and approval.
- When a notice or approval item is selected into its right-side detail panel,
  show its body expanded by default. Preserve the current collapsed behavior in
  the left feed cards and retain the user's ability to collapse the detail body.
- Replace the visible `시스템` chip/badge on system timeline events with a
  compact system indicator icon. Give the icon an accessible name and preserve
  the existing read-only system event behavior.
- Use visually distinct reply expand/collapse icons: down when replies are
  collapsed and up when expanded. Expose expanded state to assistive technology.
- Remove the divider immediately before the previous-comments control in
  notice/approval and the divider immediately after the body in approval. In
  notice, remove the body-to-reaction divider when no attachment section
  intervenes; retain the attachment-to-reaction divider when attachments exist.
  Keep unrelated section dividers and the approval-line divider.
- Apply the shared SYSTEM and reply icons to both the left feed list and detail
  views. Apply the notice reaction-to-comments divider removal to feed cards as
  well as detail views.
- Keep left-feed bodies collapsed by default. Leave notice loading behavior
  unchanged, and render document-list loading with the same feed/list skeleton
  components used by notice, matching the active view mode.

## Implementation boundaries

- Reuse `PostDetailPanel` and its content region for loading alignment rather
  than adding feature-specific spinner positioning.
- Keep selected-detail loading state and APIs owned by notice/approval feature
  code.
- Keep `FeedBodyContent` presentation shared. Set the expanded default in
  selection/detail state, not globally, so feed cards are unaffected.
- Keep system and reply indicators in `TiptapCommentThread`, shared by notice
  and approval.
- Keep notice separator removal in `NoticeFeedList` across its list and detail
  usage; do not add a mode-only switch. Render the remaining attachment-to-
  reaction divider only when an attachment section is present.
- Reuse `FeedViewSkeleton` and `ListViewSkeleton` from `DocumentWritePage` so
  its initial loading matches notice at the corresponding view mode.
- Do not change APIs, permissions, comment ordering, pagination, or mutations.

## Verification

- Add focused tests for shared panel loading alignment, expanded initial detail
  bodies, icon-only system event indication, distinct reply toggle icons and
  `aria-expanded`, and removal of the two specified dividers in both details.
- Run related shared feed, notice, and approval Vitest tests and the frontend
  production build.
- Verify notice and approval left feeds and detail panels in the browser at
  375px, 768px, and 1280px and document the result.
