# List Query Batching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove per-item database reads from notice lists and approval feeds while preserving existing response and comment-page semantics.

**Architecture:** Keep existing browser endpoints and use set-based batch queries keyed by the IDs returned from each authorized list. Batch each relation independently and assemble DTOs in the service; do not flatten one-to-many data into a single join. Preserve single-item detail and comment endpoints for their existing consumers.

**Tech Stack:** Java 17, Spring/eGovFrame, MyBatis, PostgreSQL, JUnit 5, Mockito, Maven.

---

## File Map

- `backend/src/main/java/egovframework/com/common/service/CommonCommentService.java` — add the batch page contract while retaining the existing flat batch method.
- `backend/src/main/java/egovframework/com/common/service/impl/CommonCommentServiceImpl.java` — group each owner's comment tree into `CommonCommentPageVO` and map root counts.
- `backend/src/main/java/egovframework/com/common/domain/repository/CommonCommentDAO.java` — add bulk approval user-comment and count queries.
- `backend/src/main/resources/egovframework/mapper/com/common/CommonComment_SQL_postgresql.xml` — keep comment page/count SQL tenant-, owner-type-, and soft-delete-scoped; root count must use `parent_comment_id IS NULL`.
- `backend/src/main/java/egovframework/let/groupware/community/notice/service/impl/NoticeBoardServiceImpl.java` — aggregate comment IDs across page items before loading comment attachments.
- `backend/src/main/java/egovframework/let/groupware/approval/domain/model/DocumentApprovalLineBatchVO.java` — internal line query result carrying its parent approval ID without changing API line JSON.
- `backend/src/main/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalDAO.java` — expose bulk details and bulk approval-line reads.
- `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml` — add authorized batch detail and ordered batch line SQL.
- `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java` — replace item-loop reads with the batch results and preserve feed item values.
- `backend/src/test/java/egovframework/com/common/service/CommonCommentServiceTest.java` — test batch root grouping and pagination behavior.
- `backend/src/test/java/egovframework/let/groupware/community/notice/service/impl/NoticeBoardServiceImplTest.java` — test notice result semantics and constant batch calls.
- `backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImplTest.java` — test multi-document feed grouping and no item-level reads.
- `backend/src/test/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalMapperTest.java` — test registered batch statements, tenant/authorization predicates, and root-only counts.
- `docs/directions/20261015/20261015_016_목록_조회_배치처리_작업지시서.md` — task acceptance and scope.
- `docs/plan/20261015/20261015_016_목록_조회_배치처리_계획서.md` — project-level step breakdown.
- `docs/spec/20261015/20261015_016_목록_조회_배치처리_상세사양서.md` — API/DB behavior and verification contract.
- `docs/result/20261015/list-query-batching/20261015_016_목록_조회_배치처리_결과.md` — final results and limitations.

## Task 1: Restore notice comment-page contract

**Files:**
- Modify: `backend/src/test/java/egovframework/let/groupware/community/notice/service/impl/NoticeBoardServiceImplTest.java`
- Test: same file

- [ ] **Step 1: Add a failing two-post regression test**

Build a two-post fixture where the first post has four root comments, one reply under a root, and a comment attachment. Stub one page result per owner and assert the response has exactly the newest three root groups, `commentCount=4`, `hasPreviousComments=true`, the oldest returned root as `nextBeforeCommentId`, and the reply under its parent. Verify a single `NOTICE_COMMENT` bulk file lookup receives all displayed comment IDs and no per-comment `listFiles` calls occur.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```powershell
cd backend
mvn test -q "-Dtest=NoticeBoardServiceImplTest"
```

Expected: the new page metadata/attachment-call assertions fail against the current fixed `false`/`null` metadata and per-post comment-file lookup.

## Task 2: Add a page-shaped shared batch comment service

**Files:**
- Modify: `backend/src/main/java/egovframework/com/common/service/CommonCommentService.java`
- Modify: `backend/src/main/java/egovframework/com/common/service/impl/CommonCommentServiceImpl.java`
- Modify: `backend/src/main/java/egovframework/com/common/domain/repository/CommonCommentDAO.java`
- Modify: `backend/src/main/resources/egovframework/mapper/com/common/CommonComment_SQL_postgresql.xml`
- Test: `backend/src/test/java/egovframework/com/common/service/CommonCommentServiceTest.java`

- [ ] **Step 1: Add the page-result service signature**

Keep the current `listCommentsByOwnerIds` signature for compatibility and add:

```java
Map<Long, CommonCommentPageVO> listCommentPagesByOwnerIds(
        Long tenantId, String ownerType, List<Long> ownerIds, Integer limit) throws Exception;
```

- [ ] **Step 2: Add tests for owner grouping and page metadata**

Test multiple owners with roots ordered newest-first, replies attached to their parent, a fourth root sentinel, and one owner with no comments. Assert `comments` contains at most three root groups, `hasPrevious` is true only when the sentinel exists, and `nextBeforeCommentId` is the oldest displayed root ID.

- [ ] **Step 3: Correct the bulk root-count predicate**

Update `selectCommonCommentCountsByOwnerIds` to match `countCommonComments`:

```sql
AND parent_comment_id IS NULL
AND deleted_yn = 'N'
```

Keep `tenant_id`, `owner_type`, and `owner_id IN (...)` predicates.

- [ ] **Step 4: Implement `listCommentPagesByOwnerIds`**

Use the existing bulk tree query with `limit + 1` roots to detect a previous page, group rows by owner then root, discard the sentinel group's rows, reverse only the selected root groups into existing chronological display order, set cursor/hasPrevious, and assign `resultCnt` from the root-only bulk count query. Return empty pages for requested owner IDs with no rows. Validate tenant, owner type, and the same 1–100 limit range as the existing method.

- [ ] **Step 5: Run common comment service tests**

Run:

```powershell
cd backend
mvn test -q "-Dtest=CommonCommentServiceTest"
```

Expected: PASS; root count excludes replies and soft-deleted roots, and sentinel rows never leak into the returned page.

## Task 3: Batch notice comment attachments across the page

**Files:**
- Modify: `backend/src/main/java/egovframework/let/groupware/community/notice/service/impl/NoticeBoardServiceImpl.java`
- Test: `backend/src/test/java/egovframework/let/groupware/community/notice/service/impl/NoticeBoardServiceImplTest.java`

- [ ] **Step 1: Collect page comment IDs before hydrating posts**

In `listPosts`, use `listCommentPagesByOwnerIds` once, collect all returned comment IDs across all page posts, and call `commonFileService.listFilesByOwnerIds(tenantId, "NOTICE_COMMENT", commentIds)` once.

- [ ] **Step 2: Inject page data into each post**

Pass each post's `CommonCommentPageVO`, file map, and count into the existing batch hydration overload. Attach `filesByCommentId.getOrDefault(commentId, emptyList())` to each returned comment. Set `commentCount`, `hasPreviousComments`, and `nextBeforeCommentId` from the page data. Do not change the single-post `getPost` path.

- [ ] **Step 3: Re-run notice tests**

Run:

```powershell
cd backend
mvn test -q "-Dtest=NoticeBoardServiceImplTest"
```

Expected: PASS; verify page-wide comment files are loaded with one batch service call.

## Task 4: Add failing multi-document approval-feed tests

**Files:**
- Modify: `backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImplTest.java`
- Test: same file

- [ ] **Step 1: Expand the feed fixture to two authorized documents**

Return two `DocumentApprovalListItemVO`s, two detail records, and per-document lines, attachments, events, and comments. Include at least four root user comments for one document and one reply; assert root-only count, three displayed roots, previous-page flag/cursor, correct document grouping, and no view-count write.

- [ ] **Step 2: Assert item-level reads are absent**

For the feed method, verify no calls to `selectDocumentApprovalDetail`, `selectApprovalLines`, `selectApprovalUserCommentPage`, `countApprovalUserComments`, `selectIsDocumentParticipant`, or single-owner `listFiles`. Verify one call per batch DAO/service operation for both IDs.

- [ ] **Step 3: Run the focused test and confirm it fails**

Run:

```powershell
cd backend
mvn test -q "-Dtest=DocumentApprovalServiceImplTest"
```

Expected: FAIL because the required batch detail/line/comment operations are not yet wired.

## Task 5: Implement authorization-preserving approval batch queries

**Files:**
- Create: `backend/src/main/java/egovframework/let/groupware/approval/domain/model/DocumentApprovalLineBatchVO.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalDAO.java`
- Modify: `backend/src/main/java/egovframework/com/common/domain/repository/CommonCommentDAO.java`
- Modify: `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml`
- Modify: `backend/src/main/resources/egovframework/mapper/com/common/CommonComment_SQL_postgresql.xml`

- [ ] **Step 1: Add internal batch result type**

Create `DocumentApprovalLineBatchVO extends DocumentApprovalLineVO` with one `Long electronicApprovalId` property. This value is internal for grouping only; map the final list back to existing `DocumentApprovalLineVO` objects so the public feed line shape does not gain a new serialized field.

- [ ] **Step 2: Add bulk detail SQL**

Add a mapper selecting the existing detail columns for `tenant_id = #{tenantId}` and `electronic_approval_id IN (...)`, with the same `drafter_id = #{drafterId} OR EXISTS (...) participant_user_id = #{participantUserId}` access predicate as `selectDocumentApprovalDetail`. Return a list of `DocumentApprovalDetailVO` keyed by its existing `electronicApprovalId`.

- [ ] **Step 3: Add bulk line SQL**

Add `selectApprovalLinesByOwnerIds`, selecting `line.electronic_approval_id` plus the existing line/profile/stamp columns. Keep tenant filtering, the current participant join/stamp CASE, and order by document ID, stage order, participant order. Map to `DocumentApprovalLineBatchVO`.

- [ ] **Step 4: Add batch approval user-comment page/count SQL**

Add owner-ID-scoped recursive comment tree SQL filtered to `tenant_id`, `owner_type='APPROVAL'`, and `comment_type='USER'`. Rank root groups independently by owner ID, fetch `limit + 1` groups, and include all descendants. Add a grouped root count query filtered by `parent_comment_id IS NULL` and `deleted_yn='N'`. Keep the pre-existing system-event batch mapper for system events.

- [ ] **Step 5: Expose DAO methods**

Expose the bulk detail/line methods on `DocumentApprovalDAO` and the grouped user-comment/count methods on `CommonCommentDAO`. Each method accepts a map with non-empty `ownerIds`; the service must short-circuit empty lists before invoking MyBatis.

- [ ] **Step 6: Verify mapper registration and access filters**

In `DocumentApprovalMapperTest`, parse both approval and common-comment mapper XML files, assert all four batch statement IDs are registered, and inspect bound SQL to verify tenant, deleted-row, drafter/participant, USER-only, and root-only predicates.

## Task 6: Assemble the feed from batch results

**Files:**
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java`
- Test: `backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImplTest.java`

- [ ] **Step 1: Collect authorized IDs after the list query**

After `listDocuments`, return empty immediately for an empty list. Collect non-null approval IDs from the returned authorized list and use only those IDs for all relationship reads.

- [ ] **Step 2: Read each relation in a batch**

Call the bulk detail and line DAO methods; call `commonFileService.listFilesByOwnerIds` once for `APPROVAL`, once for all returned `APPROVAL_COMMENT` IDs; call the existing system-event bulk read once; call the approval user-comment tree/count bulk operations once each.

- [ ] **Step 3: Group and attach DTO values**

Group details by `electronicApprovalId`, lines by the internal batch VO's approval ID, and all other relations by `ownerId`. Build each `DocumentApprovalFeedItemVO` from its list row and matching detail/relationship data. Convert deleted comments using the current placeholder/writer behavior and do not attach files to deleted comments.

- [ ] **Step 4: Remove obsolete feed-only per-item loading**

Remove or stop using `loadFeedDetail` from `listFeedDocuments`. Keep `getDetail`, `listApprovalComments`, and their authorization/view-history behavior unchanged for direct detail requests.

- [ ] **Step 5: Run approval feed tests**

Run:

```powershell
cd backend
mvn test -q "-Dtest=DocumentApprovalServiceImplTest"
```

Expected: PASS; one list request plus fixed relation batch operations, no per-document DAO/service reads.

## Task 7: Full verification and result record

**Files:**
- Create: `docs/result/20261015/list-query-batching/20261015_016_목록_조회_배치처리_결과.md`

- [ ] **Step 1: Run the focused suite**

```powershell
cd backend
mvn test -q "-Dtest=CommonCommentServiceTest,NoticeBoardServiceImplTest,DocumentApprovalServiceImplTest,DocumentApprovalMapperTest"
```

Expected: `BUILD SUCCESS`.

- [ ] **Step 2: Run the full backend suite**

```powershell
cd backend
mvn test -q
```

Expected: `BUILD SUCCESS`; investigate any failure before claiming completion.

- [ ] **Step 3: Check the patch**

```powershell
git diff --check
```

Expected: no whitespace errors. Review only the files in this plan; do not stage or alter unrelated pre-existing changes.

- [ ] **Step 4: Record verified outcomes**

Write the result document with the exact focused/full test outcomes, behavior preserved, DB MCP metadata evidence, no schema change, query-shape test evidence, and the reason no browser screenshot applies (backend-only change). Do not claim runtime query counts beyond what is proven by DAO invocation tests.
