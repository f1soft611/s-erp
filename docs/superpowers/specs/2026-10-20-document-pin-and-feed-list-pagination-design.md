# Personal Document Pins and Feed/List Pagination Design

## Goal

Add per-user document pinning and server-backed infinite pagination to the
document-write page's feed and list views, matching the existing file view's
20-item automatic loading behavior. Implement pin storage and retrieval first;
then paginate only unpinned documents.

## User-approved behavior

- Load 20 documents per page in latest-updated order, with document ID as a
  deterministic secondary sort.
- Load the next page automatically when the page's actual scroll container
  reaches the list sentinel.
- Keep existing cards/rows visible while loading another page and show an
  accessible spinner without loading text.
- Keep the existing initial skeleton, retry behavior, filters, detail actions,
  and summary panel.
- Restart from the first page when filters or an explicit refresh changes.
- Keep the list view's pinned-items panel separate from the ordinary paged list.
  Fetch the current user's complete, accessible pinned set separately; pinned
  items must not consume the ordinary list's 20-item page capacity.
- Provide per-user pin and unpin actions using the same PushPin action placement
  as the community notice feed.
- In feed mode, keep pinned documents before ordinary documents.
- Build feed details for the separately requested complete pinned set and the
  current ordinary page only; do not fetch unpinned documents' comments and
  attachments ahead of their page.

## Approaches considered

1. Add per-user pin storage in a dedicated tenant-scoped table and secure
   pin/unpin/list APIs; then extend the existing server offset/limit document
   page flow to support both list and feed responses. This reuses established
   paging patterns and keeps personal state out of the document record.
   **Recommended and approved.**
2. Add a global pin flag to the document record. Rejected because pin state is
   personal and must not be shared between users.
3. Store pins only in browser storage. Rejected because state would not
   synchronize between devices and could not be access-checked on the server.

## Architecture

- Add `tb_electronic_approval_pin` keyed by tenant, approval document, and
  authenticated user, with a uniqueness constraint preventing duplicate pins.
- Add authorized operations to pin/unpin a readable document and retrieve all
  pinned documents visible to that user under the current scope/type/document
  filters.
- Exclude that user's pinned document IDs from ordinary offset/limit pages.
- Extend the existing document-list request with fixed `offset` and `limit`
  parameters and return the requested page plus `totalRowCount`.
- Apply pagination to the authorized, filtered, latest-first document query.
- In feed mode, load pinned feed items first, then page the remaining base
  document records and load details, approval lines, attachments, and the
  initial comment stream only for those page IDs. Preserve the existing feed
  item response shape.
- Keep pagination state in the document-write page hook. It appends successful
  pages, ignores stale responses after filter/refresh changes, prevents
  concurrent duplicate requests, and derives `hasNext` from
  `offset + resultList.length < totalRowCount`.
- Add optional infinite-scroll props to the existing shared feed/list renderers,
  preserving their current behavior for consumers that do not enable paging.
  The renderers use the supplied scroll root and expose an accessible spinner
  while the next page is loading.
- Apply existing read authorization and current scope/type/document filters to
  both the pinned query and ordinary document pages.
- Pin and unpin actions appear in the notice-feed-style card action area and
  list row action area. Successful changes refresh pinned and ordinary lists.
- Pin and unpin failures preserve the last confirmed state and are surfaced
  through the existing notification pattern.

## Failure and loading behavior

- Initial requests continue to use the existing feed/list skeletons.
- Next-page requests retain already rendered items and show only a spinner.
- A page failure stops automatic loading and exposes the existing retry pattern;
  retry requests the failed offset.
- A filter or explicit refresh invalidates pending responses and resets the
  offset and accumulated rows.
- Empty results use the existing empty-document state.

## Validation

- Frontend tests cover first-page query size, append behavior, filters and
  refresh reset, stale responses, duplicate intersection events, loading/error
  states, and no full-feed prefetch.
- Backend tests cover page bounds, total count, latest-first deterministic
  ordering, authorization/filter preservation, and page-scoped feed enrichment.
- Run focused frontend and backend tests, then the frontend build.
- Verify loading and scroll behavior at 375px, 768px, and 1280px in the browser.
- Record screenshots and outcomes under `docs/result/20261020`.
- Inspect current DB metadata with read-only MCP before implementation. The
  approved pin feature requires a new table, so write matching SQL, change
  record, rollback, and cumulative schema documentation in the date folder.
- Read-only MCP metadata confirms `tb_electronic_approval_main` and
  `tb_electronic_approval_line_info` have no pin column. The current API also
  does not return a pin flag. The approved design therefore uses a new
  per-user pin table rather than assuming a current server pin source.
