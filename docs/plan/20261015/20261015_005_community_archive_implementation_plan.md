# Community Archive Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task after the user confirms the implementation gate. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a tenant-isolated community archive page with searchable categorized posts, administrator-managed multiple attachments, and per-file downloads.

**Architecture:** Add an archive-specific page and API that reuse the existing dashboard, common-code, board-post, and common-file patterns. Add `tenant_id` and a shared `category_code` to board posts, backfill only under a single-tenant guard, and update existing notice SQL/API persistence to keep tenant data isolated while preserving the public `noticeGubunCode` contract.

**Tech Stack:** React, TypeScript, MUI, Vitest, Spring Boot/eGovFrame, MyBatis, PostgreSQL, JUnit 5, Mockito.

---

## Approved requirements and gates

- Work instruction: [20261015_005_커뮤니티_자료실_작업지시서.md](../../directions/20261015/20261015_005_커뮤니티_자료실_작업지시서.md)
- Approved design: [2026-10-15-community-archive-design.md](../../superpowers/specs/2026-10-15-community-archive-design.md)
- Detailed specification to create before implementation: `docs/spec/20261015/20261015_005_community_archive_detailed_spec.md`
- The user approved documentation work only until the shared database changes are rechecked. Before touching implementation files, inspect current `git status`, the current `db-schema.md` diff, and both `20261015` migration directories. Preserve concurrent work, confirm the migration sequence is still free, and get user confirmation that implementation may start.
- Current read-only DB evidence: the archive board type/menu already exist; `tb_board_post` has no tenant column and uses `notice_gubun_code`; current DB has exactly one tenant. Existing post authors do not reliably identify a tenant. The migration therefore assigns all existing posts to the sole tenant only if the transactional guard finds exactly one tenant; otherwise it raises an error before commit.
- No tenant data rows, credentials, account values, or connection details may be copied into source, tests, docs, logs, or chat.

## File map

| Area | Files | Responsibility |
|---|---|---|
| Dashboard | `frontend/src/pages/dashboard/components/DashboardContent.tsx`, `frontend/src/pages/dashboard/services/dashboardData.tsx` | Route the `archive` menu key to a page and provide page title/description. |
| Archive UI | `frontend/src/pages/groupware/community/archive/ArchiveBoardPage.tsx`, `components/ArchivePostTable.tsx`, `components/ArchivePostDetail.tsx`, `components/ArchiveComposerDialog.tsx`, `hooks/useArchiveList.ts`, `hooks/useArchiveCategories.ts`, `hooks/useArchiveMutations.ts`, `services/archiveBoardService.ts`, `types/archive.types.ts` | Search/filter state, common-code categories, accessible table, detail, editor, attachments, and API adapter. Reuse shared page/detail/dialog/file UI; do not modify notice-specific editor behavior. |
| Frontend tests | `frontend/tests/archive-board-service.test.ts`, `frontend/tests/archive-page.test.tsx`, and `frontend/tests/dashboard-content.test.tsx` (only if no suitable existing dashboard routing test can be extended) | API URL/response contract, page behavior, permission-gated actions, and menu-key routing. |
| Existing notice backend | `backend/src/main/resources/egovframework/mapper/let/groupware/community/notice/NoticeBoard_SQL_postgresql.xml`, associated Notice VO/service/controller and tests | Persist `noticeGubunCode` through `category_code`; add tenant predicates and tenant-aware writes without changing existing notice URLs or JSON field names. |
| Archive backend | `backend/src/main/java/egovframework/let/groupware/community/archive/controller/ArchiveBoardApiController.java`, `domain/model/ArchiveBoardPostVO.java`, `ArchiveBoardPostSearchVO.java`, `ArchiveBoardPostSaveRequestVO.java`, `domain/repository/ArchiveBoardDAO.java`, `service/ArchiveBoardService.java`, `service/impl/ArchiveBoardServiceImpl.java`, `backend/src/main/resources/egovframework/mapper/let/groupware/community/archive/ArchiveBoard_SQL_postgresql.xml` | Archive-specific REST contract, validation, tenant-aware post operations, and shared-file integration. |
| Shared category validation | `backend/src/main/java/egovframework/let/groupware/community/common/CommunityCategoryValidator.java` | Validate an active item using the group associated with `NOTICE` or `ARCHIVE`, so both write paths enforce the same common-code pattern. |
| Backend tests | `backend/src/test/java/egovframework/let/groupware/community/notice/mapper/NoticeBoardTenantScopeMapperTest.java`, `backend/src/test/java/egovframework/let/groupware/community/common/CommunityCategoryValidatorTest.java`, `backend/src/test/java/egovframework/let/groupware/community/archive/mapper/ArchiveBoardTenantScopeMapperTest.java`, `backend/src/test/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImplTest.java`, and `backend/src/test/java/egovframework/let/groupware/community/archive/controller/ArchiveBoardApiControllerTest.java` | Assert SQL scoping, category validation, tenant writes, and administrator-only mutations. |
| Database | `backend/DATABASE/20261015/20261015_003_add_board_post_tenant_and_category.sql`, matching change-history/rollback files under `backend/DATABASE/20261015` and `docs/database/20261015`, plus `docs/database/db-schema.md` | Guarded data backfill, tenant FK/index, category column rename, rollback, and current schema documentation. The migration number must be rechecked at the implementation gate; use the next unused matching number if concurrent work has claimed `_003`. |
| Required project docs | This plan, the work instruction above, the detailed spec above, and `docs/result/20261015/community-archive/result.md` with screenshots under `docs/result/20261015/community-archive/screenshots/` | Record requirements, execution plan, API/UI/data contract, verification results, and responsive evidence. |

## API contract to implement

All archive endpoints require an authenticated `LoginVO`; reads are tenant-scoped. Create, update, delete, and upload additionally require the administrator policy from the existing `ARCHIVE` board configuration.

| Method and path | Request | Response |
|---|---|---|
| `GET /api/v1/groupware/boards/archive/posts` | `pageIndex`, `pageUnit`, optional `keyword`, optional `categoryCode` | Existing `ResultVO` envelope containing `resultList` and `resultCnt`. |
| `GET /api/v1/groupware/boards/archive/posts/{postId}` | — | Envelope containing `item`; include active attachments. |
| `POST /api/v1/groupware/boards/archive/posts` | `{ "title": "...", "contents": "...", "categoryCode": "001" }` | HTTP 201; envelope containing the created `item`. Persist the plain-text `contents` in both `contents` and searchable `contents_text`; do not accept divergent duplicate content values. |
| `PUT /api/v1/groupware/boards/archive/posts/{postId}` | Same fields as create | Envelope containing the updated `item`. |
| `DELETE /api/v1/groupware/boards/archive/posts/{postId}` | — | Administrator-only success envelope after tenant-scoped soft deletion and cleanup of the post's owned ordinary attachments. |
| `POST /api/v1/groupware/boards/archive/posts/{postId}/attachments` | multipart field `file` | HTTP 201; envelope containing attachment metadata. |
| `DELETE /api/v1/groupware/boards/archive/attachments/{boardFileId}?postId={postId}` | — | Administrator-only success envelope after tenant, post, and owner validation. |
| `GET /api/v1/groupware/boards/archive/attachments/{boardFileId}/download?postId={postId}` | — | Authenticated file response after tenant/post/owner checks. |

`categoryCode` is required for archive writes and must be an active item in the authenticated tenant's `WF_ARCHIVE_CATEGORY` group. Notice requests continue to send and receive `noticeGubunCode`; only their MyBatis persistence column changes.

## Task 1: Create the dated detailed specification

**Files:**
- Create: `docs/spec/20261015/20261015_005_community_archive_detailed_spec.md`
- Read: this work instruction, this plan, and the approved design

- [ ] **Step 1: Specify page, endpoints, and view states**

  Record the approved table columns, title/content/author search, active category filter, row selection/detail overlay, loading/empty/error states, plain-text editor, multiple attachments, and mobile behavior. Include the API table above and the unchanged notice request/response property.

- [ ] **Step 2: Specify tenant/category database contract**

  Document `tb_board_post.tenant_id` as non-null after migration, FK to `tb_tenant`, the tenant/board/newest-first index, and `category_code` replacing `notice_gubun_code`. Specify a transactional guard that raises before any migration commit unless exactly one tenant exists, assigns every existing board post to that sole tenant, and then adds `NOT NULL`, FK, and index constraints.

- [ ] **Step 3: Self-review and request approval**

  Check that the detailed spec, plan, and work instruction agree on the backfill guard, tenant scoping for notice and archive, active common-code validation, admin-only archive writes, and deferred implementation gate. Ask the user to review the dated detailed spec. Do not start code or migration work until the user approves and confirms the implementation gate.

## Task 2: Add the tenant/category migration and protect Notice behavior

**Files:**
- Create: `backend/DATABASE/20261015/20261015_003_add_board_post_tenant_and_category.sql` (or the next unused number after the implementation-gate check)
- Create: matching `*_change_schema.md` and `*_rollback.sql` files in both `backend/DATABASE/20261015/` and `docs/database/20261015/`
- Modify: `docs/database/db-schema.md`
- Modify: `backend/src/main/resources/egovframework/mapper/let/groupware/community/notice/NoticeBoard_SQL_postgresql.xml`
- Test: `backend/src/test/java/egovframework/let/groupware/community/notice/mapper/NoticeBoardTenantScopeMapperTest.java`
- Test: existing `backend/src/test/java/egovframework/let/groupware/community/notice/service/impl/NoticeBoardServiceImplTest.java`
- Create/test: `backend/src/main/java/egovframework/let/groupware/community/common/CommunityCategoryValidator.java` and `backend/src/test/java/egovframework/let/groupware/community/common/CommunityCategoryValidatorTest.java`

- [ ] **Step 1: Add failing MyBatis scope assertions**

  Parse the existing Notice mapper with MyBatis `XMLMapperBuilder`, as `ApprovalLineTemplateMapperTest` does. Assert list/count/detail SQL, including `selectNoticePostById`, include `p.tenant_id = ?` and `p.board_type_code = ?`; assert insert SQL includes `tenant_id` and writes the renamed `category_code`; assert update/pin/delete/view-count SQL include `tenant_id = ?`, `post_id = ?`, and `board_type_code = ?`; and assert view-history inserts retain the tenant. Use parameter keys `tenantId`, `boardTypeCode`, `postId`, `noticeGubunCode`, `keyword`, `recordCountPerPage`, and `firstIndex`. Add failing validator tests proving `NOTICE` accepts only active items from `NOTICE_GUBUN` and `ARCHIVE` accepts only active items from `WF_ARCHIVE_CATEGORY`. Run:

  ```powershell
  cd backend
  mvn -Dtest=NoticeBoardTenantScopeMapperTest,CommunityCategoryValidatorTest test
  ```

  Expected before implementation: the new assertions fail because the current mapper has no `tenant_id`, references `notice_gubun_code`, and has no shared category validator.

- [ ] **Step 2: Add the guarded migration and paired history**

  In one transaction: prevent concurrent tenant additions while checking tenant count; rename `notice_gubun_code` to `category_code`; add nullable `tenant_id`; require exactly one row in `tb_tenant` and raise an exception otherwise; update all existing `tb_board_post` rows to that tenant; set `tenant_id NOT NULL`; add the FK to `tb_tenant(tenant_id)` and the tenant/board/newest-first index. Rollback removes index/FK/column and renames `category_code` to `notice_gubun_code`, but must abort if post rows are assigned to more than one tenant so rollback cannot silently collapse tenant ownership. Copy byte-identical SQL/history/rollback files to `docs/database/20261015/` and `backend/DATABASE/20261015/`. Do not apply DDL through the read-only MCP.

- [ ] **Step 3: Update Notice mapper tenant/category SQL**

  Preserve each existing method ID and Java property name. Change category references to `category_code`; insert using `#{tenantId}` and filter list/count/detail/update/pin/delete/view-count using tenant ID. Keep `board_type_code = #{boardTypeCode}`. Ensure update/delete statements use the composite ownership condition:

  ```sql
  WHERE tenant_id = #{tenantId}
    AND post_id = #{postId}
    AND board_type_code = #{boardTypeCode}
  ```

- [ ] **Step 4: Pass tenant context through Notice service operations**

  Add a Spring `CommunityCategoryValidator` that maps `NOTICE` to `NOTICE_GUBUN` and `ARCHIVE` to `WF_ARCHIVE_CATEGORY`, resolves the group for the authenticated tenant, and accepts only active matching items. Inject it into `NoticeBoardServiceImpl` and validate create/update categories before writes. Put `tenantId` into every Notice mapper parameter map, including detail reads, view-count updates, and view-history writes, and ensure every read/write mapper call receives the authenticated tenant. Keep `NoticeBoardApiController` paths and JSON properties unchanged. Add regression assertions to `NoticeBoardServiceImplTest` that captured DAO maps include the correct `tenantId`, the category remains under the existing `noticeGubunCode` request property, and inactive or unknown Notice categories are rejected.

- [ ] **Step 5: Update schema documentation and run focused tests**

  Change the `tb_board_post` entry in `docs/database/db-schema.md` from `notice_gubun_code` to `category_code`, add `tenant_id` and its FK/index details, and explain category-group interpretation by board type. Run:

  ```powershell
  cd backend
  mvn -Dtest=NoticeBoardTenantScopeMapperTest,CommunityCategoryValidatorTest,NoticeBoardServiceImplTest test
  ```

  Expected: mapper, category-validator, and existing Notice service tests pass; `git diff --check` reports no whitespace errors.

## Task 3: Implement the archive backend

**Files:**
- Create: the archive controller, service/interface/implementation, DAO, four model files, and MyBatis mapper listed in the file map
- Test: `backend/src/test/java/egovframework/let/groupware/community/archive/mapper/ArchiveBoardTenantScopeMapperTest.java`
- Test: `backend/src/test/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImplTest.java`
- Test: `backend/src/test/java/egovframework/let/groupware/community/archive/controller/ArchiveBoardApiControllerTest.java`

- [ ] **Step 1: Add failing service tests**

  Test that list/detail SQL parameters always contain authenticated `tenantId` and fixed `boardTypeCode="ARCHIVE"`; create/update accepts only an active code from the tenant's `WF_ARCHIVE_CATEGORY`; disabled/missing/wrong-group categories fail with a client error; only administrators can mutate; attachments use common-file owner type `ARCHIVE`; and download/delete reject another tenant's or another post's attachment. `CommunityCategoryValidatorTest` is introduced in Task 2 and covers both board-to-group mappings.
  Add `ArchiveBoardTenantScopeMapperTest` using `XMLMapperBuilder` to assert every post list/count/detail/insert/update/delete statement binds `tenant_id` and `board_type_code='ARCHIVE'`, upload/delete use the same tenant-scoped `SELECT ... FOR UPDATE` post lookup, and every attachment lookup/mutation binds tenant, owner type, post, and file IDs as applicable.

  ```powershell
  cd backend
  mvn -Dtest=ArchiveBoardServiceImplTest,ArchiveBoardApiControllerTest test
  ```

  Expected before implementation: the new tests fail because the archive controller and service do not exist.

- [ ] **Step 2: Implement request/response models and mapper statements**

  Define search fields `tenantId`, `keyword`, `categoryCode`, `pageIndex`, `pageUnit`, `firstIndex`, and `recordCountPerPage`; define save fields `title`, `contents`, and `categoryCode`, deriving `contentsText` from the same plain-text contents. Test that the mapper persists the same plain-text value to `contents` and `contents_text`. Map output fields `postId`, `title`, `contents`, `contentsText`, `categoryCode`, `writerId`, `writerName`, `createdAt`, and `attachmentCount`, with attachment metadata in detail. Every post statement must constrain `tenant_id` and `board_type_code='ARCHIVE'`; every attachment statement must constrain `tenant_id`, `owner_type='ARCHIVE'`, and `owner_id=postId`.

- [ ] **Step 3: Implement archive service validation and operations**

  Use authenticated `tenantId` for every DAO and common-file call.   Use `CommunityCategoryValidator` to require an active `WF_ARCHIVE_CATEGORY` item before saves and validate any category filter; group resolution uses `CommonCodeGroupService.listGroups(tenantId, condition)` and `CommonCodeItemService`. Enforce `EgovAccessControlHelper.isTenantAdmin(user)` for create/update/delete/upload and verify the board is enabled and allows uploads before file writes. In transactional upload and post-delete operations, lock the same tenant-owned post row before checking/deleting files so a racing upload cannot commit an orphan after deletion. Use existing soft-delete semantics: mark the post deleted and delete its owned ordinary attachments through `CommonFileService`; archive has no embedded-image cleanup path. Use common-file storage rather than adding a new storage system.

- [ ] **Step 4: Implement archive controller endpoints**

  Add the exact routes and envelopes in the API contract. Reject missing authentication, empty files, and invalid payloads with the repository's `ResponseStatusException`/`ResultVO` patterns. Provide authenticated file download only after checking post type, tenant, and attachment owner.

- [ ] **Step 5: Run backend tests and inspect mapper coverage**

  Run:

  ```powershell
  cd backend
  mvn -Dtest=NoticeBoardTenantScopeMapperTest,CommunityCategoryValidatorTest,NoticeBoardServiceImplTest,ArchiveBoardTenantScopeMapperTest,ArchiveBoardServiceImplTest,ArchiveBoardApiControllerTest test
  ```

  Expected: all selected tests pass and no Notice route or request-property assertion changes. Run `mvn test` after focused tests pass.

## Task 4: Add archive frontend services and category loading

**Files:**
- Create: `frontend/src/pages/groupware/community/archive/services/archiveBoardService.ts`
- Create: `frontend/src/pages/groupware/community/archive/hooks/useArchiveCategories.ts`
- Create: `frontend/src/pages/groupware/community/archive/hooks/useArchiveList.ts`
- Create: `frontend/src/pages/groupware/community/archive/types/archive.types.ts`
- Test: `frontend/tests/archive-board-service.test.ts`

- [ ] **Step 1: Add failing service/category tests**

  Assert list request query serialization for page, keyword, and category; response normalization for `resultList`/`resultCnt`; detail/create/update/delete paths; multipart upload field name `file`; and attachment download/delete ownership parameters. Assert common-code loading requests `WF_ARCHIVE_CATEGORY`, filters inactive items, preserves API order, and exposes failures to the page instead of silently treating them as an empty successful result. Run:

  ```powershell
  cd frontend
  npm run test -- tests/archive-board-service.test.ts
  ```

  Expected before implementation: test imports fail because the archive service and hooks do not exist.

- [ ] **Step 2: Add typed archive API service**

  Define API types for post, save payload (`title`, plain-text `contents`, and `categoryCode`), attachment, and `{ resultList, resultCnt }`. Implement only the routes in the API contract using existing `apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiPostFormData`, and `apiDownload` helpers.

- [ ] **Step 3: Add category and list hooks**

  Load the common-code group via `fetchCommonCodeGroups({ groupCode: 'WF_ARCHIVE_CATEGORY' })`, then its items via `fetchCommonCodeItems(group.id)`. Keep only `useAt === 'Y'`; surface group/item request errors through the page's error state. Sequence overlapping category reloads so stale success/error/finally handlers cannot override the latest state. Load paginated list using server search and category filters; reset to page one when either filter changes.

- [ ] **Step 4: Run the focused frontend service tests**

  Run `npm run test -- tests/archive-board-service.test.ts`. Expected: all URL, category, and error-state assertions pass.

## Task 5: Build the archive page and wire dashboard navigation

**Files:**
- Create: `frontend/src/pages/groupware/community/archive/ArchiveBoardPage.tsx`
- Create: `frontend/src/pages/groupware/community/archive/components/ArchivePostTable.tsx`
- Create: `frontend/src/pages/groupware/community/archive/components/ArchivePostDetail.tsx`
- Create: `frontend/src/pages/groupware/community/archive/components/ArchiveComposerDialog.tsx`
- Create: `frontend/src/pages/groupware/community/archive/hooks/useArchiveMutations.ts`
- Modify: `frontend/src/pages/dashboard/components/DashboardContent.tsx`
- Modify: `frontend/src/pages/dashboard/services/dashboardData.tsx`
- Test: `frontend/tests/archive-page.test.tsx`

- [ ] **Step 1: Add failing page tests**

  Assert `DashboardContent` with `selectedModule.id="groupware"` and `currentPageKey="archive"` renders a `자료실` page; active categories appear in filters and editor; title/content/author search and category selection reload the correct list; selecting a row loads detail and its attachments; downloads call the file service; manager-only controls appear only when `isTenantAdmin` and menu create/update/delete permissions allow them; and API errors render an actionable retry state. Run:

  ```powershell
  cd frontend
  npm run test -- tests/archive-page.test.tsx
  ```

  Expected before implementation: archive page import or behavior assertions fail.

- [ ] **Step 2: Add dashboard page content and dispatch**

  Add `archive` content metadata in `dashboardData.tsx` and a `currentPageKey === 'archive'` branch in `DashboardContent.tsx`. Pass existing `selectedMenuPermissions` and `isTenantAdmin` into the page. Do not add or duplicate URL/menu rows; the menu system already derives the `archive` key from `/groupware/community/archive`.

- [ ] **Step 3: Implement list, search, and responsive table**

  Compose shared `PageHeader` and `PageSearchArea` patterns with an accessible MUI table. Display title, category, author, registration date, and file count. Put any narrow-screen overflow inside the table container, not the page. Use theme tokens and the shared loading/error/empty state patterns.

- [ ] **Step 4: Implement detail and administrator editor**

  Use `PostDetailPanel`/`PageAreaOverlay` to show plain-text description and per-file downloads. Build an archive-specific simple multiline text editor; do not reuse notice embedded-image routes. Support selecting multiple files, retaining existing files while editing, removing selected existing attachments, and confirmation before deletion. Disable editor controls while saving and the delete action while deletion is pending. After mutations, reload the current list and surface failed uploads/deletions without a success message.

- [ ] **Step 5: Run focused frontend tests and production build**

  Run:

  ```powershell
  cd frontend
  npm run test -- tests/archive-board-service.test.ts tests/archive-page.test.tsx
  npm run build
  ```

  Expected: focused tests pass and TypeScript/Vite build exits successfully.

## Task 6: Browser verification and result documentation

**Files:**
- Create: `docs/result/20261015/community-archive/result.md`
- Create screenshots under: `docs/result/20261015/community-archive/screenshots/`

- [ ] **Step 1: Recheck shared-worktree and server state**

  Inspect `git status --short` and the implementation files before testing. If starting Vite, require port 4173 using `npm run dev -- --strictPort`; reuse an existing verified S-ERP server and do not stop a server that was already running.

- [ ] **Step 2: Verify the exact page at all target widths**

  Open `http://127.0.0.1:4173/groupware/community/archive`. Verify list/search/category selection/detail/download/admin actions at 1280px and check horizontal overflow, text clipping, and detail close behavior at 768px and 375px. Save screenshots at each width under the result screenshots directory. If authentication or API data prevents a specific interaction, record the exact limitation instead of substituting a success claim.

- [ ] **Step 3: Write the result document**

  Record the work instruction/plan/spec links, files changed, migration and rollback filenames, DB MCP evidence, tests/build commands and outcomes, responsive browser findings, screenshots, and any deferred item. Do not record tenant row data or credentials.

- [ ] **Step 4: Final verification**

  Run `git diff --check`, focused frontend and backend tests, frontend build, and the full backend `mvn test` suite. Confirm the result document and screenshots exist and that no unrelated shared-worktree changes were staged or modified.

## Implementation stop point

The immediate approved work in this conversation is documentation only. Complete Task 1, present the dated detailed spec to the user, and wait for explicit approval. Before Task 2, recheck the shared database files and get confirmation to proceed; do not stage, edit, or apply any database migration before that confirmation.
