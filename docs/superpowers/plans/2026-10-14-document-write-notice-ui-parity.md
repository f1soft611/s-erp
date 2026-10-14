# Document Write Notice UI Parity Implementation Plan

> **For agentic workers:** Use this plan task-by-task. Preserve the approved boundaries: shared UI only, no notice business logic, no backend/API/DB contract changes.

**Goal:** Align document feed cards with notice UI, expand document content inline in feed mode, and keep detail open with quiet refresh after composer close/save.

**Architecture:** Keep approval data and interactions in the document-writing feature. Reuse `FeedCard` and `FeedBodyContent`; extract the existing approval-body embedded-image lifecycle so feed and detail render the same authenticated HTML safely. Let the page hook own lazy detail cache and quiet list refresh; send a refresh signal to the still-mounted detail panel after the composer closes.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Vite.

---

## File Map

- Modify `frontend/src/pages/groupware/documents/write/components/DocumentFeedItem.tsx`: render summary/body using shared feed primitives; accept body loading, retry and toggle props without a detail-open callback.
- Modify `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`: connect feed body state and callbacks; preserve list detail selection; keep selected detail mounted when opening the composer; request quiet refresh when the composer closes.
- Modify `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts`: own per-document detail cache, fetch/error/loading state for feed expansion, and quiet list/summary refresh.
- Create `frontend/src/pages/groupware/documents/write/hooks/useDocumentApprovalBody.ts`: normalize approval embedded-image source references, fetch authenticated image blobs, and provide collapsed/expanded HTML and cleanup.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`: use the shared body hook and refetch its current detail quietly when the parent refresh signal changes.
- Modify `frontend/tests/document-feed-item.test.tsx`: assert shared feed presentation and inline expansion UI.
- Modify `frontend/tests/document-write-page.test.tsx`: assert feed/list distinction, lazy fetch/cache/error/retry, detail persistence, and quiet refresh.
- Create dated direction, plan, detailed spec, result report, and 375px/768px/1280px browser screenshots under `docs/directions/20261014`, `docs/plan/20261014`, `docs/spec/20261014`, and `docs/result/20261014/document-write-notice-ui-parity`.

## Task 1: Lock behavior with focused tests

**Files:** `frontend/tests/document-feed-item.test.tsx`, `frontend/tests/document-write-page.test.tsx`

- [ ] **Step 1: Add component tests for the feed card.** Assert `document-write-item` uses `data-feed-card="true"`, shows its title, summary, document kind and status; assert an accessible `더보기` control can invoke the expansion callback and no card click callback is required.
- [ ] **Step 2: Add page tests for feed/list behavior.** Switch to feed mode, invoke `더보기` for a document, and assert detail API access begins while `page-area-overlay` remains absent. Separately select the same document in list mode and assert the overlay opens.
- [ ] **Step 3: Add feed loading/error/retry tests.** Hold the mocked detail request pending and assert an accessible inline loading status. Reject the first request, assert visible inline error and retry control, resolve the retry, and assert the body appears. Re-expand the same document after collapsing and assert it does not make a second detail request.
- [ ] **Step 4: Add edit-overlay regression tests.** In list mode open document detail, use `문서 더보기` → `문서 수정` or `수정 후 재상신`, then assert both the detail panel and composer dialog remain in the DOM.
- [ ] **Step 5: Add quiet-refresh assertions.** Close the composer and resolve the list/detail requests; assert the panel remains, old content stays visible while requests are pending, the list skeleton and `문서 상세 불러오는 중` status do not appear, and updated detail content replaces the old content after resolution.
- [ ] **Step 6: Run the focused tests and verify the new behavior fails before implementation.**

Run: `cd frontend; npm run test -- tests/document-feed-item.test.tsx tests/document-write-page.test.tsx`

Expected: failures specifically show missing feed expansion/data state, automatic detail closure, and full loading on refresh.

## Task 2: Reuse approval body rendering for feed and detail

**Files:** `frontend/src/pages/groupware/documents/write/hooks/useDocumentApprovalBody.ts`, `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`

- [ ] **Step 1: Extract the current approval embedded-image pipeline into `useDocumentApprovalBody(electronicApprovalId, contentsHtml)`.** Return `bodyHtml`, `expandedBodyHtml`, `collapsedBodyHtml`, `images`, and `imageError`. Preserve the current URL rule: only match `/api/v1/groupware/approvals/{id}/embedded-images/{fileId}` for the active document; remove source URLs before rendering; use `fetchApprovalEmbeddedImageBlob`; revoke every object URL on cleanup; keep the current partial-image failure message.
- [ ] **Step 2: Replace `DocumentApprovalDetailFeed`'s local body parsing/fetch/rewrite effects with the hook.** Keep its current `FeedBodyContent`, image preview, image viewer, expanded-by-default detail behavior, and tests unchanged.
- [ ] **Step 3: Run the existing approval detail/image tests before wiring the feed.**

Run: `cd frontend; npm run test -- tests/document-write-page.test.tsx`

Expected: existing detail body and authenticated embedded-image tests pass.

## Task 3: Implement inline feed expansion and lazy content cache

**Files:** `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts`, `frontend/src/pages/groupware/documents/write/components/DocumentFeedItem.tsx`, `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`

- [ ] **Step 1: Add page-hook feed state keyed by document ID.** Maintain cached `DocumentApprovalDetail` records, the currently expanded document ID, the active detail-fetch document ID, and per-document fetch errors. `toggleFeedDocument(id)` collapses an already expanded card; for uncached content, call `getDocumentApprovalDetail(id)`, cache success, and expand only that card. On failure retain the summary and store `error.message` or `문서 본문을 불러오지 못했습니다.`; invoking the same toggle again retries.
- [ ] **Step 2: Update `DocumentFeedItem` props and markup.** Remove `onClick` from the `FeedCard`; retain author/date, document-kind badge and approval-status badge. Render the summary while no detail body is cached. While fetching, render a card-local `role="status"` and disabled expansion control. On error, render `role="alert"` and an enabled retry control. After success, pass cached `contentsHtml` through `useDocumentApprovalBody` and `FeedBodyContent`; determine `hasMore` by comparing plain body text with `item.summary` and checking for embedded images.
- [ ] **Step 3: Wire feed state only into feed mode.** Pass `expandedDocumentId`, cache entry, loading/error state and `toggleFeedDocument` to each `DocumentFeedItem`. Keep the list's existing `onItemClick={(item) => openDetail(Number(item.id))}` unchanged. Keep pinned items, filtering, empty state and default list mode unchanged.
- [ ] **Step 4: Run focused feed/page tests and confirm feed expansion does not open the panel.**

Run: `cd frontend; npm run test -- tests/document-feed-item.test.tsx tests/document-write-page.test.tsx`

Expected: inline body, status/type badges, cache reuse, retry, list selection and no feed-triggered overlay all pass.

## Task 4: Keep detail mounted and refresh quietly

**Files:** `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts`, `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`, `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`

- [ ] **Step 1: Extend the page refresh request with a quiet option.** `refresh({ quiet: true })` increments the list request revision without setting `isLoading`; ordinary scope/kind/selected-document changes continue to show the existing skeleton. Clear and set `loadError` through the existing explicit error path.
- [ ] **Step 2: Keep detail selected when opening the composer.** In `onEditDocument`, set `editingDocument` and open the composer without calling `closeDetail()`. In the composer `onClose`, close/reset the composer, clear `editingDocument`, call `refresh({ quiet: true })`, and increment a `detailRefreshToken` while leaving `detailDocumentId` intact.
- [ ] **Step 3: Add a detail refresh token prop.** In `DocumentApprovalDetailFeed`, keep initial `isLoading` behavior on ID/open changes. When only `detailRefreshToken` changes, call `getDocumentApprovalDetail(electronicApprovalId)` without clearing the current `detail` or enabling the full panel loader; on success replace `detail`; on error set the existing detail `loadError`.
- [ ] **Step 4: Run focused regression tests for modal close/save and detail errors.**

Run: `cd frontend; npm run test -- tests/document-write-page.test.tsx`

Expected: detail stays mounted under the dialog; close/save triggers quiet list and detail fetch; no full skeleton flashes; updated title/body appear; refresh failures are visible while the panel remains open.

## Task 5: Documentation and browser verification

**Files:** `docs/directions/20261014/20261014_006_문서작성_피드_공지사항_UI_정합성_작업지시서.md`, `docs/plan/20261014/20261014_006_문서작성_피드_공지사항_UI_정합성_계획서.md`, `docs/spec/20261014/20261014_006_문서작성_피드_공지사항_UI_정합성_상세사양서.md`, `docs/result/20261014/document-write-notice-ui-parity/`

- [ ] **Step 1: Run focused tests and production build.**

Run: `cd frontend; npm run test -- tests/document-feed-item.test.tsx tests/document-write-page.test.tsx`

Expected: both targeted suites pass.

Run: `cd frontend; npm run build`

Expected: TypeScript and Vite production build complete successfully.

- [ ] **Step 2: Verify browser behavior on the required route.** Use the existing S-ERP browser at `http://127.0.0.1:4173/groupware/doc/write`; check list-to-detail, feed expansion, error-free content, edit modal stacking, and quiet refresh. Verify widths 375px, 768px and 1280px; check for horizontal overflow.
- [ ] **Step 3: Save screenshots and write the result report.** Store screenshots in `docs/result/20261014/document-write-notice-ui-parity/screenshots/` and record the exact test/build/browser outcomes and any failed checks in `20261014_006_문서작성_피드_공지사항_UI_정합성_결과보고서.md`.

## Self-Review

- Feed uses shared card/body presentation; document labels and permissions stay feature-owned.
- Only feed body expansion fetches document detail. Feed actions never open the side panel; list selection continues to do so.
- Approval embedded image source validation, authenticated blob fetch, partial-error reporting and URL cleanup are reused by both feed and detail.
- Composer close/save leaves the current detail mounted; list and detail refresh without a full loading skeleton; errors remain explicit.
- No API contract, backend, database, notice behavior or approval state transition is changed.
- Tests cover lazy loading, error/retry, cache, feed/list separation, panel persistence and quiet refresh; browser checks cover required viewports.
