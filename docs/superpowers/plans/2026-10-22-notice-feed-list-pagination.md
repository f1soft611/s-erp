# Notice Feed/List Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the community notice page's feed and list load 20 ordinary notices at a time and display the complete filtered pinned-notice set separately, matching document-write behavior.

**Architecture:** Keep server pagination and pin filtering on the existing notice-list API. `useNoticeList` owns page, stale-request, retry, and pinned-collection state; the notice feed and list both use the existing shared `ViewModePagination` behavior. Pinned notices are loaded independently in pages until the server-reported total is complete and are excluded from ordinary results.

**Tech Stack:** React, TypeScript, MUI, Vitest, existing notice board API, shared view-mode components.

---

## File map

- `frontend/src/pages/groupware/community/notice/hooks/useNoticeList.ts`: initial 20-item load, ordinary next-page append, all-pinned page collection, filter/refresh reset, stale-response protection, and page errors.
- `frontend/src/pages/groupware/community/notice/CommunityNoticePage.tsx`: capture the actual scroll root and pass pagination state/callbacks to the active feed or list.
- `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`: remove its independent end observer and forward shared pagination props to `FeedView`.
- `frontend/src/shared/components/view-mode/ViewModePagination.tsx`: allow a caller-specific accessible loading label while preserving the existing document default.
- `frontend/src/shared/components/view-mode/FeedView.tsx`: accept and forward the pagination loading label through its existing optional pagination prop.
- `frontend/src/shared/components/view-mode/ListView.tsx`: accept and forward the same label through its existing optional pagination prop.
- `frontend/tests/use-notice-list.test.tsx`: hook contract tests for first pages, appending, all pinned pages, errors, and stale responses.
- `frontend/tests/notice-page-local-updates.test.tsx`: integration tests for 20-item filter arguments, shared paging in feed/list, and pin refresh behavior.
- `frontend/tests/common-view-mode.test.tsx`: retain default loading-label behavior and verify a notice-specific label can be provided.
- `docs/directions/20261022/20261022_006_공지사항_피드_리스트_페이징_작업지시서.md`: approved work instruction and acceptance criteria.
- `docs/plan/20261022/20261022_006_공지사항_피드_리스트_페이징_계획서.md`: dated S-ERP implementation plan.
- `docs/spec/20261022/20261022_006_공지사항_피드_리스트_페이징_상세사양서.md`: exact paging, pin separation, failure, and responsive behavior.
- `docs/result/20261022/notice-feed-list-pagination/result.md`: implementation and verification record.
- `docs/result/20261022/notice-feed-list-pagination/screenshots/`: browser screenshots at 375px, 768px, and 1280px.

## Task 1: Create the dated work instruction

**Files:**
- Create: `docs/directions/20261022/20261022_006_공지사항_피드_리스트_페이징_작업지시서.md`
- Read: `docs/superpowers/specs/2026-10-22-notice-feed-list-pagination-design.md`
- Read: `docs/superpowers/specs/2026-10-20-document-pin-and-feed-list-pagination-design.md`

- [ ] Record the approved goal and boundaries: 20-item ordinary pagination in both views, separate complete pinned results, existing API only, no schema/API contract change, and preserved notice actions.
- [ ] Record acceptance criteria for pagination errors/retry, filter/refresh reset, pinned exclusion/no duplicates, and browser verification.
- [ ] Verify the work instruction has no behavior that contradicts the approved design.

## Task 2: Create the dated plan and detailed specification

**Files:**
- Create: `docs/plan/20261022/20261022_006_공지사항_피드_리스트_페이징_계획서.md`
- Create: `docs/spec/20261022/20261022_006_공지사항_피드_리스트_페이징_상세사양서.md`
- Read: `docs/directions/20261022/20261022_006_공지사항_피드_리스트_페이징_작업지시서.md`

- [ ] Put the affected hook, page, feed renderer, shared pagination renderer, and tests in the plan's file map.
- [ ] Specify ordinary API calls as `fetchNoticePosts(page, 20, '', category || undefined, 'N')`.
- [ ] Specify pinned API calls as `fetchPinnedNoticePosts(page, 20, '', category || undefined)` until the sum of returned records reaches `resultCnt`.
- [ ] Specify page state reset and generation checks on filter changes, view-mode refresh, and explicit reload; a stale page response must not append to the active results.
- [ ] Specify `hasNext` from accumulated ordinary item count versus `resultCnt`, and retry of the same failed page.
- [ ] Specify that all pinned pages complete before replacing the displayed pinned set; on failure, expose an error rather than marking a partial set complete.
- [ ] Specify that an empty pinned page before reaching `resultCnt`, or a page response that adds no new IDs, fails explicitly instead of looping indefinitely.
- [ ] Specify shared `ViewModePagination` for both feed and list, with `다음 공지 불러오는 중` as the loading status label and the existing default label retained for document views.
- [ ] Review the dated specification against the approved design and ensure every behavior has a test or browser check.

## Task 3: Add failing hook tests

**Files:**
- Modify: `frontend/tests/use-notice-list.test.tsx`
- Read: `frontend/src/pages/groupware/community/notice/hooks/useNoticeList.ts`

- [ ] Add a test that first load requests ordinary page 1 with size 20 and `isPinned='N'`, and pinned page 1 with size 20 and the active category.
- [ ] Add a test with `resultCnt=45` for pinned results that resolves page 1 with 20 items, page 2 with 20, and page 3 with 5; assert that 45 pins replace the displayed set only after all three responses complete.
- [ ] Add a next-page test that appends ordinary page 2 once, updates the page and `hasMore`, and ignores duplicate requests while the page is in flight.
- [ ] Add a next-page failure test that preserves current rows, exposes an error, and retries the same page.
- [ ] Add a filter/reset test proving an older unresolved list request cannot replace a newer filter's ordinary or pinned data.
- [ ] Run `npm run test -- tests/use-notice-list.test.tsx` from `frontend`; confirm the new assertions fail before implementation.

## Task 4: Implement notice hook paging and complete pinned loading

**Files:**
- Modify: `frontend/src/pages/groupware/community/notice/hooks/useNoticeList.ts`
- Test: `frontend/tests/use-notice-list.test.tsx`

- [ ] Pass `'N'` as the ordinary query's pin filter and retain the selected category in both ordinary and pinned queries.
- [ ] Track the active list generation; reset ordinary page, `hasMore`, loading-more, page error, and pending offset when a new initial load begins.
- [ ] Load pinned pages sequentially with the existing service, accumulate records locally, and update `pinnedNoticeItems` only after the fetched count reaches `resultCnt`; throw an explicit error if a page is empty or makes no progress before the total is reached.
- [ ] Track the in-flight ordinary page in a ref as well as loading state, and append by unique notice ID only after a successful response for the current generation.
- [ ] Derive ordinary `hasMore` using `currentItems.length + nextPage.resultList.length < resultCnt`.
- [ ] Make retry request the same page that failed; clear the error only when retry begins.
- [ ] Ensure initial-load, refresh, and load-more failures remain visible through existing notice error presentation and do not create unhandled promise rejections.
- [ ] Re-run `npm run test -- tests/use-notice-list.test.tsx`; expect all hook tests to pass.

## Task 5: Use shared pagination in notice feed and list

**Files:**
- Modify: `frontend/src/pages/groupware/community/notice/CommunityNoticePage.tsx`
- Modify: `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`
- Modify: `frontend/src/shared/components/view-mode/ViewModePagination.tsx`
- Modify: `frontend/src/shared/components/view-mode/FeedView.tsx`
- Modify: `frontend/src/shared/components/view-mode/ListView.tsx`
- Test: `frontend/tests/notice-page-local-updates.test.tsx`
- Test: `frontend/tests/notice-page.test.tsx`
- Test: `frontend/tests/common-view-mode.test.tsx`

- [ ] Add optional `loadingLabel` to `ViewModePagination` with the current document label as its default; pass the optional value through `FeedView` and `ListView`.
- [ ] Add a `pagination` prop to `NoticeFeedList` and forward it to its `FeedView`.
- [ ] Remove `NoticeFeedList`'s `onReachEnd` observer and end sentinel so a notice page cannot start duplicate page requests through two observers.
- [ ] Capture the actual scrollable `Box` element in `CommunityNoticePage` and use it as the pagination observer root.
- [ ] Pass the same `hasNext`, `isLoadingMore`, `pageError`, `loadMore`, and retry callbacks to feed and list, with the notice-specific loading label.
- [ ] Keep the pinned panel outside the ordinary feed/list and continue selecting pinned notices through the existing detail callback.
- [ ] Verify pin/unpin success reloads both the ordinary and pinned datasets so a notice moves between sections without appearing twice.
- [ ] Run `npm run test -- tests/notice-page-local-updates.test.tsx tests/notice-page.test.tsx tests/common-view-mode.test.tsx`; expect the shared sentinel, list mode, and feed mode tests to pass.

## Task 6: Run focused verification

**Files:**
- Read: `frontend/package.json`
- Run: notice pagination and shared view-mode tests

- [ ] Run `npm run test -- tests/use-notice-list.test.tsx tests/notice-page-local-updates.test.tsx tests/notice-page.test.tsx tests/common-view-mode.test.tsx` from `frontend`.
- [ ] Run `npm run build` from `frontend`.
- [ ] Confirm the tests cover the exact 20-item request size, full pinned count, pinned/ordinary separation, list and feed pagination, loading status, page retry, duplicate-request guard, and stale response behavior.

## Task 7: Verify browser behavior and record results

**Files:**
- Create: `docs/result/20261022/notice-feed-list-pagination/result.md`
- Create: `docs/result/20261022/notice-feed-list-pagination/screenshots/`

- [ ] Confirm `http://127.0.0.1:4173` is the S-ERP server and reuse it if active; do not switch ports.
- [ ] Verify feed mode loads 20 ordinary notices, then appends the next page at the shared sentinel while pinned notices remain in the separate panel.
- [ ] Verify list mode loads and appends pages identically, and a page failure exposes retry without removing already loaded rows.
- [ ] Verify category changes restart both data sets and do not allow a previous request to overwrite the new results.
- [ ] At 375px, 768px, and 1280px, capture feed and list views with pinned notices and pagination controls in the English-named screenshots folder.
- [ ] Write the result report with changed files, test/build commands and outcomes, browser viewport checks, and any remaining limitations.
- [ ] Stop only a dev server started for this task; do not stop a pre-existing shared server.
