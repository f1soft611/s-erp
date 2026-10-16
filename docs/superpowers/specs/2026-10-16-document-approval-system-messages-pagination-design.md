# Document Approval System Messages in Comment Pages

## Goal

Include document-approval system messages in the same visible, paged stream as
user comments. The initial page contains the three newest top-level stream
items. “이전 댓글 보기” loads up to 20 older top-level items. This keeps
system messages from appearing outside the page limit or being omitted from
the previous-page cursor and remaining-item count.

## Current Behavior

- The feed initially pages the three newest user-comment roots.
- Replies are returned with their root comment and do not use additional root
  page slots.
- System messages are fetched separately and all are rendered, regardless of
  the user-comment page.
- The displayed comment total adds system-message count to user-comment count,
  but the page cursor and remaining count are based only on user comments.

## Chosen Design

Treat each top-level user-comment thread and each system message as one
top-level stream item. Select items by descending creation time, using the
persisted comment ID as a stable tie-breaker. Render each selected page in
chronological order. Keep replies attached to their parent user comment and
include them in the response with that root; replies do not consume page slots.
A deleted user-comment root with at least one non-deleted descendant remains a
visible tombstone thread and counts as one USER stream item. A thread whose root
and every descendant are deleted is excluded.

The initial page has a limit of three stream items. Each previous-page request
has a limit of 20. Both limits and the cursor operate over the combined stream,
not over user comments alone. The cursor identifies the oldest returned root
item, whether it is a user comment or a system message. `hasPrevious` and the
remaining count use the same combined set.

The page response continues to carry user comments and system messages in
separate typed collections so existing comment-thread rendering and
system-message styling remain distinct. System-message records include their
persisted comment ID so they can participate in the unified cursor and stable
ordering. `commentCount` represents the total number of top-level stream items
(user-comment roots plus system messages); replies are not additional stream
items. The UI must not add the displayed system-message count a second time.
USER roots use the existing thread-visibility rule: include a root when its
tree contains at least one non-deleted comment, even if the root itself is a
deleted-comment tombstone. Count that visible thread once.

The same paging contract applies to preloaded feed details and to the existing
document-detail comment endpoint. Older pages append to the currently loaded
stream. Loading, error, retry, and mutation behavior otherwise remain
unchanged.

## Alternatives Considered

1. **Unified backend paging (selected).** Query user-comment roots and system
   messages together for page selection, then attach replies and attachments
   to selected user-comment roots. This keeps the initial page, older pages,
   count, and cursor consistent.
2. **Frontend merge of existing independent data.** The initial response has
   only a limited user-comment page while all system events are fetched
   separately. It cannot reliably build a mixed previous page or cursor and
   can render more than the stated limit.
3. **Display all system messages outside the paged stream.** This preserves the
   current behavior and does not satisfy the requested page limit.

## Scope and Constraints

- Extend the existing document approval comment-page response and feed payload;
  do not create a separate endpoint.
- Reuse the existing common-comment records and system event data. No database
  schema change is planned.
- Preserve user-comment reply trees, attachment loading, comment mutations,
  permissions, and system-message presentation.
- Do not change notice-feed pagination or other document behaviors.
- Before backend/API contract implementation, verify the current database
  metadata through the registered read-only PostgreSQL MCP as required by the
  repository instructions.
- Update the document-write work direction, detailed specification, relevant
  API/frontend tests, and dated result report. Include the existing browser
  screenshot requirements only if the changed screen is visually affected.

## Error Handling

Use the existing explicit comment-load error and retry behavior. A failed
unified page request must not be treated as an empty successful page or advance
the cursor. Invalid or missing page metadata remains an API contract error.

## Verification

- The initial page contains at most three top-level items across user comments
  and system messages, ordered by creation time; all replies of selected user
  comment roots remain attached. A deleted root with a live reply is counted
  once as its visible tombstone thread; a fully deleted thread is excluded.
- Previous-page requests return at most 20 older combined items, advance the
  cursor across either item type, and stop when none remain.
- Total and remaining counts include system messages exactly once and exclude
  replies as separate page items while counting every visible USER thread,
  including a deleted root with live replies, exactly once.
- Feed preloaded data and list-detail comment paging use the same mixed-page
  contract.
- Existing user-comment mutations, attachments, error/retry behavior, and
  system-message display remain intact.
- Run focused backend and frontend tests and the frontend production build.
