# Document Write Detail Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render every document matching the active filters as a complete notice-style feed after one detailed-list request, while making view switches reload with view-specific skeletons and preserving list-panel edit behavior.

**Architecture:** Add an opt-in `includeDetails=true` variant to the existing document-list endpoint. It returns each matching list row with document body, approval lines, attachments, and the initial comment page, without recording a document view; the default list response remains unchanged. The frontend requests the enriched response only in feed mode, waits for the full request before rendering cards, and seeds the existing feed/detail component with those results so it does not issue per-card initial detail/comment requests.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Spring Boot/eGovFrame, MyBatis, JUnit, Mockito, Maven.

---

## File map

- Modify `backend/src/main/java/egovframework/let/groupware/approval/controller/DocumentApprovalApiController.java` to accept optional `includeDetails` on `GET /documents` and preserve the default list branch.
- Modify `backend/src/main/java/egovframework/let/groupware/approval/service/DocumentApprovalService.java` and `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java` to return permission-filtered feed rows with hydrated detail and initial comments without writing view history.
- Create `backend/src/main/java/egovframework/let/groupware/approval/domain/model/DocumentApprovalFeedItemVO.java` for the additive feed response shape while leaving `DocumentApprovalListItemVO` and summary notices unchanged.
- Modify `backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImplTest.java` and `backend/src/test/java/egovframework/let/groupware/approval/controller/DocumentApprovalApiControllerTest.java` to verify feed hydration, access boundaries, and unchanged default behavior.
- Modify `frontend/src/pages/groupware/documents/write/services/documentApproval.service.ts` and `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts` to request and validate enriched list records.
- Modify `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts` and `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx` to reload on view-mode switches, select lightweight/enriched responses by mode, render the corresponding skeleton, and commit feed data only after a successful response.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentFeedItem.tsx` and `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx` so feed cards consume preloaded detail/comment data and preserve existing comment paging/mutations and local reaction behavior.
- Modify `frontend/tests/document-feed-item.test.tsx` and `frontend/tests/document-write-page.test.tsx` for preloaded card data, one detailed-list call, mode-switch loading, stale response handling, and existing edit/panel behavior.
- Update `docs/directions/20261014/20261014_006_문서작성_피드_공지사항_UI_정합성_작업지시서.md`, `docs/plan/20261014/20261014_006_문서작성_피드_공지사항_UI_정합성_계획서.md`, and `docs/spec/20261014/20261014_006_문서작성_피드_공지사항_UI_정합성_상세사양서.md` to the approved data flow.
- Create `docs/result/20261014/document-write-notice-ui-parity/20261014_006_문서작성_피드_공지사항_UI_정합성_결과보고서.md` and screenshots at 375px, 768px, and 1280px.

## Before implementation: align the dated work documents

**Files:**
- Modify: `docs/directions/20261014/20261014_006_문서작성_피드_공지사항_UI_정합성_작업지시서.md`
- Modify: `docs/plan/20261014/20261014_006_문서작성_피드_공지사항_UI_정합성_계획서.md`
- Modify: `docs/spec/20261014/20261014_006_문서작성_피드_공지사항_UI_정합성_상세사양서.md`

- [ ] Replace the work-order's viewport-lazy-load requirement with the approved flow: every mode switch reloads; list uses the lightweight list response; feed uses one `includeDetails=true` list request and its mode-specific skeleton.
- [ ] Update the dated plan to include backend contract tests, the additive feed DTO, frontend preloaded data, stale-response handling, quiet refresh regressions, and MCP-before-implementation verification.
- [ ] Update the detailed specification with the exact enriched root fields, initial three-root comment page/cursor contract, no view-count writes during feed hydration, all-or-nothing response behavior, and unchanged default list/summary contracts.
- [ ] Verify the direction, plan, detailed spec, and this implementation plan agree; do not begin code until these documents are consistent.

## Task 1: Confirm the current database contract and add backend regression tests

**Files:**
- Test: `backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImplTest.java`
- Test: `backend/src/test/java/egovframework/let/groupware/approval/controller/DocumentApprovalApiControllerTest.java`

- [ ] Before backend implementation, call the read-only `s-erp-postgresql-readonly` MCP `list_tables`, then `describe_table` for the approval document, approval-line, comment, and common-file tables identified by that list. Do not query tenant data rows unless metadata alone cannot confirm a field needed by the current contract. Record the table/column evidence in the result report; no schema change is proposed.
- [ ] Add `feedListHydratesVisibleDocumentsWithoutRecordingViews` to `DocumentApprovalServiceImplTest`: return two permitted list rows from `approvalDAO.selectRelatedDocumentList`, return matching `DocumentApprovalDetailVO`s, one approval line, one attachment, and a comment page for each row; assert both feed rows include body, line, attachment, comments, count, and cursor metadata.
- [ ] In that test, verify the feed path never calls `selectLoginIdByLoginCode`, `insertElectronicApprovalViewHistory`, or `incrementElectronicApprovalViewCount`; verify comment attachments are retained and each detail lookup uses only the matching listed ID and authenticated tenant/actor parameters.
- [ ] Add a default-list regression assertion that `listDocuments` returns its original list items and does not query document details, attachments, approval lines, or comments.
- [ ] Add a controller test proving `includeDetails=false` calls `listDocuments`, while `includeDetails=true` calls the feed-list service method and returns its rows under the existing `resultList` envelope.
- [ ] Run the new targeted tests before implementation and confirm they fail because the feed DTO/service branch is absent.

Run from `backend`:

```powershell
mvn -Dtest=DocumentApprovalServiceImplTest,DocumentApprovalApiControllerTest test
```

Expected before implementation: test compilation or assertions fail specifically for missing feed-list behavior; the existing unrelated tests are not the failure target.

## Task 2: Add the opt-in detailed-list response on the backend

**Files:**
- Create: `backend/src/main/java/egovframework/let/groupware/approval/domain/model/DocumentApprovalFeedItemVO.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/controller/DocumentApprovalApiController.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/service/DocumentApprovalService.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java`
- Test: `backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImplTest.java`
- Test: `backend/src/test/java/egovframework/let/groupware/approval/controller/DocumentApprovalApiControllerTest.java`

- [ ] Define `DocumentApprovalFeedItemVO` as a feed-only response type extending the existing list item. Add the exact root fields `draftingWorkCategoryId`, `contentsJson`, `contentsHtml`, `contentsText`, `viewCount`, `isDrafter`, `approvalLines`, `attachments`, `systemEvents`, `comments`, `commentCount`, `hasPreviousComments`, and `nextBeforeCommentId`. Initialize collection fields to empty lists and use `@JsonProperty("isDrafter")` for the boolean JSON key.
- [ ] Keep the existing `listDocuments(LoginVO, scope, documentType, electronicApprovalId)` method unchanged. Add a typed `listFeedDocuments(...)` service method so the ordinary list and summary-notice payloads do not acquire new nullable fields.
- [ ] Add the optional `includeDetails` query parameter with default `false` to `DocumentApprovalApiController.listDocuments`. When false, call the existing service method; when true, call `listFeedDocuments`. Keep the route, filters, authentication, status, and `resultList` envelope unchanged.
- [ ] Implement `listFeedDocuments` by applying the same authenticated scope/type/ID validation and `selectRelatedDocumentList` filter as `listDocuments`, then hydrate only those returned records. For each listed ID, load the detail under the same authenticated tenant/actor, map it to the feed DTO, and attach the existing three-root initial comment page including comment attachments and cursor metadata.
- [ ] Reuse or extract a read-only detail-hydration helper that sets attachments, approval lines, and system events but does not call view-history insert or view-count increment methods. Keep `getDetail`'s existing view-count behavior unchanged.
- [ ] Treat a missing/inaccessible detail or a failed comment/attachment hydration as a failed feed-list request; do not return a success-shaped partially hydrated row. Do not modify Mapper SQL or database schema unless the MCP/code review proves the current queries cannot supply the response.
- [ ] Run `mvn -Dtest=DocumentApprovalServiceImplTest,DocumentApprovalApiControllerTest test` and confirm feed rows serialize with the stated property names and the legacy list branch remains unchanged.

The feed item JSON shape is additive only when `includeDetails=true`:

```json
{
  "electronicApprovalId": 77,
  "title": "문서 제목",
  "contentsJson": "{}",
  "contentsHtml": "<p>본문</p>",
  "contentsText": "본문",
  "approvalLines": [],
  "attachments": [],
  "comments": [],
  "commentCount": 0,
  "hasPreviousComments": false,
  "nextBeforeCommentId": null
}
```

Run:

```powershell
Set-Location backend
mvn -Dtest=DocumentApprovalServiceImplTest,DocumentApprovalApiControllerTest test
```

Expected: focused backend tests pass and the non-enriched endpoint response is unchanged.

## Task 3: Add frontend feed response typing and request selection

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`
- Modify: `frontend/src/pages/groupware/documents/write/services/documentApproval.service.ts`
- Test: `frontend/tests/document-write-page.test.tsx`

- [ ] Add `DocumentApprovalFeedRecord` with the list fields plus the detail fields and comment pagination metadata from the backend contract. Keep `DocumentApprovalRecord` as the lightweight list/summary type.
- [ ] Add overloads to `listDocumentApprovals`: calls without the opt-in return `Promise<DocumentApprovalRecord[]>`; calls with `true` return `Promise<DocumentApprovalFeedRecord[]>`. Add `includeDetails=true` to the query only for the latter call.
- [ ] Validate the enriched response before returning it: every record must have an integer ID, string body HTML, arrays for approval lines/attachments/comments, and valid comment pagination fields. Throw the repository-standard explicit response error when the envelope or required feed fields are malformed.
- [ ] Add service/page assertions that list mode sends no `includeDetails` parameter and feed mode sends exactly `includeDetails=true`; verify malformed enriched data rejects rather than falling back to summary cards.
- [ ] Run `Set-Location frontend; npx vitest run tests/document-write-page.test.tsx` and verify the new feed request assertions fail before the request implementation and pass afterward.

## Task 4: Reload on view changes and render the feed atomically

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts`
- Modify: `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [ ] Include `viewMode` in the list loading effect. Each actual feed/list mode switch must call the list service again, set `isLoading` before awaiting the request, and select the enriched overload only for feed mode. Existing filter/scope changes continue to reload in the selected mode.
- [ ] Preserve the existing `active` request guard so late responses from a previous view/filter cannot replace the currently selected view. On detailed-list failure, keep an explicit error and render no partial/summary-only feed.
- [ ] Keep `getDocumentApprovalSummary()` behavior separate and unchanged. Continue to wait for the selected list request before rendering its rows; while waiting show `FeedViewSkeleton` for feed and `ListViewSkeleton` for list.
- [ ] Map enriched records to feed items without discarding metadata or pinned ordering. In list mode, keep lightweight rows, pinned panel, selection, and side-detail behavior unchanged.
- [ ] Add tests for list-to-feed and feed-to-list reloads, each mode's skeleton, filter changes while in feed mode, error/no-partial-feed behavior, stale-request suppression, and rendering every returned document exactly once.
- [ ] Run `Set-Location frontend; npx vitest run tests/document-write-page.test.tsx` and confirm both switch directions and existing panel selection pass.

## Task 5: Seed full-detail cards from the list response

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentFeedItem.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Modify: `frontend/tests/document-feed-item.test.tsx`
- Modify: `frontend/tests/document-write-page.test.tsx`

- [ ] Remove `IntersectionObserver` and per-card initial detail/comment fetching from `DocumentFeedItem`; a card is mounted only after the page has the complete detailed-list result.
- [ ] Add a typed preloaded-feed-data prop to `DocumentApprovalDetailFeed`. In feed presentation, seed detail, initial user comments, comment count, and pagination cursor from that prop and do not call `getDocumentApprovalDetail` or the initial `listApprovalComments`.
- [ ] Keep panel presentation's existing detail/profile fetch and initial comment fetch unchanged. Keep the existing service calls for older-comment paging, comment CRUD, comment attachment operations, and authenticated embedded images.
- [ ] Preserve the feed card's document-specific permission menu, edit/delete actions, local-only like/bookmark controls, and omission of approval-processing controls. Keep feed interactions from opening the right detail panel.
- [ ] Add component tests proving that preloaded body/approval lines/attachments/comments render without per-card detail/comment requests; verify older-comment paging still requests the existing cursor service and new comment actions still mutate the existing comment thread.
- [ ] Add or retain page tests for every filtered document, pinned documents, local reaction, panel non-opening, feed menu behavior, and list panel processing actions.
- [ ] Run `Set-Location frontend; npx vitest run tests/document-feed-item.test.tsx tests/document-write-page.test.tsx`.

## Task 6: Preserve quiet editing and update the dated project documents

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [ ] Preserve the selected `detailDocumentId` when the detail panel's edit action opens the composer.
- [ ] On composer close/save, keep the existing `refresh({ quiet: true })` path and refresh token: list and active feed details refresh without replacing the existing content with mode skeletons; the selected list detail remains visible until refreshed.
- [ ] Test composer cancel and save separately, asserting the side panel remains mounted, no list/detail skeleton appears during quiet refresh, and refreshed data replaces old data only after success.
- [ ] Run the focused frontend suite and the two focused backend test classes after the cross-layer documentation and quiet-refresh updates.

## Task 7: Build, browser-check, and record the result

**Files:**
- Create: `docs/result/20261014/document-write-notice-ui-parity/20261014_006_문서작성_피드_공지사항_UI_정합성_결과보고서.md`
- Create: `docs/result/20261014/document-write-notice-ui-parity/screenshots/`

- [ ] Run `Set-Location frontend; npm run build` and record its exit status and any warnings.
- [ ] Run `Set-Location backend; mvn -Dtest=DocumentApprovalServiceImplTest,DocumentApprovalApiControllerTest test` and record the test summary. Run `mvn test` if the targeted backend tests reveal interactions outside their classes or the implementation changes shared service behavior.
- [ ] Confirm `http://127.0.0.1:4173` is the existing S-ERP Vite server before browser use; reuse it and do not terminate it. If it is unavailable, start `npm run dev -- --strictPort` on 4173 and stop only the process started for this check after browser verification.
- [ ] At 375px, 768px, and 1280px, verify feed switch/refetch skeleton, complete body/comments/attachments appearing together, list switch/refetch skeleton, list-row detail panel, comment paging/action, local like, and composer-over-panel quiet refresh. Check for horizontal overflow and save one screenshot per viewport under the result screenshots directory.
- [ ] Write the result report with the final API contract, MCP table/column verification or explicit MCP failure and alternate evidence, changed files, focused test/build outcomes, browser sizes, screenshot links, and any known pre-existing failures. Confirm unrelated dirty files were not modified or included.

Run:

```powershell
Set-Location frontend
npm run build
Set-Location ..\backend
mvn -Dtest=DocumentApprovalServiceImplTest,DocumentApprovalApiControllerTest test
```

Expected: frontend production build and targeted backend tests pass; the feed makes one enriched document-list request and the list continues using the unchanged lightweight response.
