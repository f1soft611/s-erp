# Document Feed and List Pagination Design

## Goal

Add server-backed infinite pagination to the document-write page's feed and list
views, matching the existing file view's 20-item automatic loading behavior.

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
  Pinned items must not consume the ordinary list's 20-item page capacity.
- Build feed details only for documents in the requested page; do not fetch
  every document's comments and attachments up front.

## Approaches considered

1. Extend the existing server offset/limit document-page flow to support both
   list and feed responses. This reuses the established API and SQL paging
   patterns with the smallest change set. **Recommended and approved.**
2. Add a new cursor-based document page API like the file endpoint. This is
   more resilient to records moving during pagination, but adds a separate
   pagination contract and cursor validation path.
3. Fetch the full document list and paginate only in the browser. Rejected
   because it does not reduce response size or server work.

## Architecture

- Extend the existing document-list request with fixed `offset` and `limit`
  parameters and return the requested page plus `totalRowCount`.
- Apply pagination to the authorized, filtered, latest-first document query.
- For feed mode, page the base document records first, then load details,
  approval lines, attachments, and the initial comment stream only for those
  page IDs. Preserve the existing feed item response shape.
- Keep pagination state in the document-write page hook. It appends successful
  pages, ignores stale responses after filter/refresh changes, prevents
  concurrent duplicate requests, and derives `hasNext` from
  `offset + resultList.length < totalRowCount`.
- Add optional infinite-scroll props to the existing shared feed/list renderers,
  preserving their current behavior for consumers that do not enable paging.
  The renderers use the supplied scroll root and expose an accessible spinner
  while the next page is loading.
- Retain pinned-item separation and current filter semantics. Do not introduce
  a pin-management feature or a database schema change.
- The existing approval list response and current database metadata do not
  expose a persisted pin field. Preserve the current client-side panel contract;
  do not invent a backend pin source as part of pagination.

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
- Confirm no database schema change; inspect the current DB contract through
  the registered read-only MCP before implementation because the API data
  contract is changing.
- Read-only MCP metadata confirms `tb_electronic_approval_main` and
  `tb_electronic_approval_line_info` have no pin column. The current API also
  does not return a pin flag, so this change preserves the panel structure but
  does not create or claim a server-side all-pins data source.
