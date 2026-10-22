# Notice Feed/List Pagination Design

## Goal

Align the community notice page's feed, list, and pinned-item loading behavior
with the document-write page's 20-item pagination pattern. Keep pinned notices
separate from the ordinary paged results and show the complete pinned set.

## Current behavior

- The notice feed loads 20 ordinary notices initially and asks its own
  end-of-list observer to load more.
- The notice list loads the same initial page but has no next-page control.
- Pinned notices are requested separately, but only page 1 (up to 20 items) is
  displayed.
- The document-write page keeps pinned items separate, loads ordinary records
  in pages of 20, and uses the shared view-mode pagination component for both
  feed and list.

## Approved behavior

- Both notice feed and list use 20-item pages and append subsequent results
  when the active content scroll reaches the pagination sentinel.
- Reuse the shared `ViewModePagination` behavior for both presentations:
  retain already-loaded items, show the loading indicator, stop automatic
  retries after a page failure, and expose a retry action for that page.
- Keep notice server paging as `pageIndex`/`pageUnit`; no backend or database
  contract change is required.
- Fetch pinned notices independently from the ordinary results, applying the
  selected notice-category filter to both requests.
- Exclude pinned notices from the ordinary feed/list query so a notice appears
  in only the pinned panel, matching document-write behavior.
- Load every pinned notice by using the existing pinned-filter query and
  continuing through its pages until `resultCnt` is satisfied. Do not limit
  the pinned panel to the first 20 results.
- Reset ordinary and pinned result state when the category filter changes or
  the user explicitly refreshes. Ignore results from obsolete list requests.
- Preserve current detail, comment, edit, pin-toggle, summary, and empty-state
  behavior.

## Implementation

### Notice list data

Keep pagination state in `useNoticeList`: current page, whether another page
exists, loading-more state, and an error for the failed page. The initial
ordinary query requests only non-pinned notices, page 1, size 20. Loading the
next page appends unique records and derives whether more data exists from the
server's `resultCnt`.

Load pinned notices separately from the same existing list service using the
pinned filter and current notice category. Fetch successive pages until the
reported total is collected, then publish the complete pinned set. A failed
pinned request must be surfaced as a page-level list error rather than silently
presenting a partial pinned set as complete.

### Feed and list rendering

Remove the feed-specific end-of-list pagination path and wire the shared
pagination component to the notice feed and list with the page's actual scroll
root. The feed and list use the same load-more and retry callbacks. Keep
existing content visible while a subsequent page loads.

Pinned notices remain in the separate `PinnedItemsPanel`; ordinary feed cards
and list rows contain only unpinned notices. A successful pin/unpin action
refreshes both datasets so the notice moves between the sections.

## Error handling

- Initial ordinary-list failures continue to use the notice page's existing
  error and retry presentation.
- A next-page failure keeps existing items, stops sentinel-triggered retries,
  and presents an explicit retry control.
- A pinned-list failure is reported; it must not be treated as a successfully
  loaded complete pinned set.
- Stale results from a prior filter or refresh must not overwrite the current
  page state.

## Alternatives considered

1. **Add shared paging to both notice presentations and load all pins through
   the existing filtered list API (selected).** This matches document-write
   paging semantics without changing backend contracts.
2. **Add a dedicated notice pinned-list endpoint.** This could return all
   pinned notices in one call, but adds backend API surface when the current
   endpoint already supports the pinned filter and page metadata.
3. **Only add list pagination and retain the feed observer.** This leaves two
   different pagination implementations and inconsistent retry behavior.

## Verification

- Test that initial ordinary notice requests exclude pinned items and request
  20 records.
- Test feed and list pagination appending later pages, using the correct
  filter, guarding duplicate requests, and retaining existing rows on failure.
- Test pinned notices load separately across pages until the server total is
  reached, are not duplicated in the ordinary results, and refresh after
  pin/unpin.
- Run focused notice tests and the frontend production build.
- Verify feed and list pagination and pinned separation in a browser at
  375px, 768px, and 1280px, and save the screenshots in the dated result
  folder.
