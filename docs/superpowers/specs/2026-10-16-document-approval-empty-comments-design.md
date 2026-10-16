# Document Approval Empty Comment State

## Goal

When a document has no user comments and no system messages, do not display the
empty-state text `등록된 댓글이 없습니다.` in its comment section.

## Chosen Design

Remove only the empty-state message from `DocumentApprovalDetailFeed`. Keep the
comment input and all other existing behavior, including loading indicators,
error alerts, retry actions, paging controls, and rendering of user comments
and system messages. When both comment collections are empty after loading,
the comment list area remains without an empty-state label.

## Alternatives

1. **Remove only the message (selected).** This matches the request and leaves
   the composer and existing controls available.
2. Hide the entire comment section when empty. This would also remove the
   comment composer and change more behavior than requested.
3. Replace the message with different placeholder text. This retains an empty
   state despite the explicit request to remove it.

## Scope

- Frontend only; no API, backend, or database changes.
- Limit implementation to the empty-state branch in
  `DocumentApprovalDetailFeed.tsx`.
- Add a focused regression assertion that the empty-state text is absent while
  the comment composer remains available.
- Update the existing approval comment-page specification and dated result
  report to reflect the empty-state behavior.

## Verification

- With no USER comments and no SYSTEM messages, `등록된 댓글이 없습니다.` is
  absent and the comment input remains available.
- Existing loading, error/retry, USER, and SYSTEM rendering behavior remains
  unchanged.
- Run the focused frontend test and verify the patch formatting.
