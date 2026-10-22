# Community Archive Search and Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the archive's paged chip-filter grid flow with a responsive grouped folder/file list, advanced uploaded-date and type filters, and one-response results while keeping existing tables and upload/update/delete behavior.

**Architecture:** The archive endpoint will validate and apply tenant-scoped keyword, folder, uploaded-date, and file-type filters and return all matches without pagination. The frontend will keep the existing F1Grid in local-row mode for the returned result set, adding folder and section rows, a shared detailed-search control, and permission-gated folder/file actions. Archive-only UI components will be changed; shared `FileView` and unrelated dirty worktree files will not be modified.

**Tech Stack:** Java 17, Spring Boot/eGovFrame, MyBatis/PostgreSQL, React 19, TypeScript, MUI, F1Grid, Vitest, JUnit 5.

---

## File map

### Required dated project documents

- Create `docs/directions/20261020/20261020_009_커뮤니티_자료실_검색_파일목록_개선_작업지시서.md` with the approved scope, constraints, acceptance conditions, and the database/API checks required before coding.
- Create `docs/plan/20261020/20261020_009_community_archive_search_layout_plan.md` with the implementation phases and validation commands.
- Create `docs/spec/20261020/20261020_009_커뮤니티_자료실_검색_파일목록_상세사양서.md` with query names, inclusive date behavior, type mapping, folder navigation, permission rules, and list row behavior, linked to the approved design.

### Backend files

- Modify `backend/src/main/java/egovframework/let/groupware/community/archive/domain/model/ArchiveBoardFileSearchVO.java` to accept keyword, folder code, date bounds, and file type without offset/limit.
- Modify `backend/src/main/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImpl.java` to normalize and validate filters, preserve tenant scoping and active-destination validation for mutations, and return the full filtered list with its count.
- Modify `backend/src/main/resources/egovframework/mapper/let/groupware/community/archive/ArchiveBoard_SQL_postgresql.xml` to apply inclusive date bounds, MIME/extension type groups, current-folder scope, and newest-first order without `LIMIT`/`OFFSET`.
- Update `backend/src/test/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImplTest.java`, `backend/src/test/java/egovframework/let/groupware/community/archive/controller/ArchiveBoardApiControllerTest.java`, and `backend/src/test/java/egovframework/let/groupware/community/archive/mapper/ArchiveBoardTenantScopeMapperTest.java` for validation, binding, tenant scope, filters, and unpaged SQL.
- `ArchiveBoardApiController` already binds `ArchiveBoardFileSearchVO` via `@ModelAttribute`; change it only if controller tests show a binding or response contract gap.

### Frontend files

- Modify `frontend/src/pages/groupware/community/archive/types/archive.types.ts` with a shared `ArchiveFileType`, search-filter type, and stable discriminated browser-row type.
- Modify `frontend/src/pages/groupware/community/archive/services/archiveBoardService.ts` to serialize keyword, folder, date, and type filters without offset/limit.
- Modify `frontend/src/pages/groupware/community/archive/hooks/useArchiveList.ts` to fetch the full result set with explicit loading/error/retry state and initialize the active date range to the last year.
- Modify `frontend/src/pages/groupware/community/archive/hooks/useArchiveCategories.ts` to expose the active common-code group and full editable items needed by the existing folder-management dialog, and include inactive folders as read-only navigation rows.
- Modify `frontend/src/pages/groupware/community/archive/ArchiveBoardPage.tsx` to integrate the keyword/detail search, root/folder navigation, create actions, category dialog, and file operations.
- Modify `frontend/src/pages/groupware/community/archive/components/ArchiveFileGrid.tsx` to use local `rows` (not `F1GridDataSource`) and render folder/file section rows plus responsive file columns and actions.
- Create `frontend/src/pages/groupware/community/archive/components/ArchiveFileEditDialog.tsx` for file-name and destination-folder changes, with input validation and save/error states.
- Update `frontend/tests/archive-board-service.test.ts` and `frontend/tests/archive-page.test.tsx`; add `frontend/tests/archive-file-grid.test.tsx` only if the row component needs isolated interaction tests.
- Update `frontend/src/pages/f1-grid-docs/F1-GRID.md` to replace the archive section's paged-data-source guidance with its local-row/file-browser behavior.
- Update `docs/result/20261020/community-archive-file-folder-grid/result.md` with this follow-up's implementation, tests, MCP evidence, and browser screenshots. Store screenshots under `docs/result/20261020/community-archive-file-folder-grid/screenshots/`.

## Task 1: Create dated work order, project plan, and detailed specification

**Files:**
- Create the three dated documents listed in the file map.
- Reference `docs/superpowers/specs/2026-10-20-community-archive-search-layout-design.md`.

- [x] **Step 1: Write the work order**

Include: root/folder grouped list; all matching results in one response; default last-one-year upload-date filter; type categories and mapping; current-location scope; create/update/delete permission rules; unchanged tables; required DB MCP metadata verification; and explicit acceptance checks.

- [x] **Step 2: Write the dated project plan**

Use the same phases as this implementation plan, with exact frontend/backend test commands and a responsive browser verification stage. Keep this plan and the date-prefixed document linked so neither becomes a conflicting source.

- [x] **Step 3: Write the detailed specification**

Use request fields `keyword`, `folderCode`, `uploadedFrom`, `uploadedTo`, and `fileType`. Define date bounds as optional inclusive `yyyy-MM-dd` dates; either bound can be blank, and clearing both explicitly removes the date restriction. Translate a present upper bound to the next day's exclusive timestamp in SQL. Define type values as `ALL`, `DOCUMENT`, `SPREADSHEET`, `PRESENTATION`, `PDF`, `IMAGE`, `VIDEO`, and `ARCHIVE`; unknown types appear only for `ALL`. Record the approved extension groups in the design document, root/folder behavior, permission-gated actions, inactive-folder read/reactivation behavior, and the full-response/no-pagination contract.

- [x] **Step 4: Self-check the documents**

Run `git diff --check`; verify all three docs match the approved design and do not prescribe schema changes or touch unrelated features.

## Task 2: Implement server-side search filters and remove archive paging

**Files:**
- Modify `backend/src/main/java/egovframework/let/groupware/community/archive/domain/model/ArchiveBoardFileSearchVO.java`
- Modify `backend/src/main/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImpl.java`
- Modify `backend/src/main/resources/egovframework/mapper/let/groupware/community/archive/ArchiveBoard_SQL_postgresql.xml`
- Test the three archive backend test files listed above.

- [x] **Step 1: Verify database/API evidence before editing**

Use the registered workspace PostgreSQL read-only MCP in this order: `list_tables`, then `describe_table` for `tb_common_file` and `tb_board_post`. Verify the relevant columns and types only; do not query tenant rows. Record the result in the dated result document later. If MCP is unavailable, report that explicitly and use the mapper/domain classes as the permitted fallback without claiming MCP verification.

- [x] **Step 2: Confirm there are no other file-list API consumers**

Search the repository for `/api/v1/groupware/boards/archive/files` and `fetchArchiveFiles`. Keep unrelated changes untouched. If an in-repository consumer outside the archive page exists, stop before changing the request contract and get the user's direction.

- [x] **Step 3: Write failing service and mapper tests**

Replace the paged service expectation with query filter expectations:

```java
search.setKeyword(" manual ");
search.setFolderCode(" GENERAL ");
search.setUploadedFrom("2025-10-20");
search.setUploadedTo("2026-10-20");
search.setFileType("PDF");

verify(dao).selectArchiveFileList(argThat(params ->
        Long.valueOf(71L).equals(params.get("tenantId"))
                && "manual".equals(params.get("keyword"))
                && "GENERAL".equals(params.get("folderCode"))
                && "2025-10-20".equals(params.get("uploadedFrom"))
                && "2026-10-20".equals(params.get("uploadedTo"))
                && "PDF".equals(params.get("fileType"))
                && Boolean.FALSE.equals(params.get("rootOnly"))));
```

Also assert root scope when `folderCode` is blank; inactive folder codes remain readable without calling the active-category validator; invalid date strings, reversed date ranges, and unknown type codes return `400`; blank bounds work independently and two blank bounds omit date predicates; `ALL` adds no type filter. Upload/update tests must continue requiring active-category validation. Update the mapper test to assert all list filters include tenant/archive/file ownership constraints, date lower/upper predicates, MIME/extension type conditions, and no `LIMIT` or `OFFSET`.

- [x] **Step 4: Run the targeted backend tests and confirm they fail**

Run from `backend`:

```powershell
mvn -Dtest=ArchiveBoardServiceImplTest,ArchiveBoardApiControllerTest,ArchiveBoardTenantScopeMapperTest test
```

Expected: the new filter and no-pagination assertions fail against the existing offset/limit implementation.

- [x] **Step 5: Add validated query fields**

In `ArchiveBoardFileSearchVO`, retain `tenantId`, `keyword`, and `folderCode`; add `String uploadedFrom`, `String uploadedTo`, and `String fileType`; remove the `offset` and `limit` fields. Parse each nonblank date with `LocalDate.parse`, allow either date bound to be blank, and reject malformed dates or a reversed complete range with `ResponseStatusException(HttpStatus.BAD_REQUEST, ...)`. Normalize `ALL` to no file-type condition and reject values outside the eight documented type codes. Keep tenant ID sourced only from the authenticated principal. Do not call the active-category validator for list queries: the mapper's tenant and archive scope makes a selected inactive category safe to read, while invalid/foreign codes return no rows. Preserve active-category checks for upload and update methods.

The request model fields are:

```java
private String uploadedFrom;
private String uploadedTo;
private String fileType;
```

Only put nonblank parsed bounds in the mapper parameter map. When both bounds are present, reject `uploadedFrom` after `uploadedTo`; when only one is present, apply only that side of the date range.

- [x] **Step 6: Add mapper filters and full result ordering**

Add date filters with this shape:

```xml
<if test="uploadedFrom != null and uploadedFrom != ''">
    AND f.created_at >= CAST(#{uploadedFrom} AS date)
</if>
<if test="uploadedTo != null and uploadedTo != ''">
    AND f.created_at < CAST(#{uploadedTo} AS date) + INTERVAL '1 day'
</if>
```

For each named type, use the approved MIME group first; use the matching lowercase filename suffix list only when MIME is blank or generic (`application/octet-stream`). For example, PDF matches `application/pdf`, or a `.pdf` suffix when the stored MIME is null, blank, or generic. Keep unknown values out of named filters. Preserve `ORDER BY f.created_at DESC, f.file_id DESC` and remove pagination from `selectArchiveFileList`; retain the count query with the exact same filter fragment.

- [x] **Step 7: Run the targeted backend tests**

Run the command from Step 4. Expected: all selected tests pass, including controller binding from date/type query parameters and tenant-scope mapper checks.

## Task 3: Update frontend request/filter state and add filter tests

**Files:**
- Modify `frontend/src/pages/groupware/community/archive/types/archive.types.ts`
- Modify `frontend/src/pages/groupware/community/archive/services/archiveBoardService.ts`
- Modify `frontend/src/pages/groupware/community/archive/hooks/useArchiveList.ts`
- Test `frontend/tests/archive-board-service.test.ts`

- [x] **Step 1: Write failing API serialization tests**

Assert a complete request is serialized without paging:

```ts
await fetchArchiveFiles({
  keyword: 'travel policy',
  folderCode: 'GUIDE',
  uploadedFrom: '2025-10-20',
  uploadedTo: '2026-10-20',
  fileType: 'PDF',
});
expect(apiMocks.apiGet).toHaveBeenCalledWith(
  '/api/v1/groupware/boards/archive/files?keyword=travel+policy&folderCode=GUIDE&uploadedFrom=2025-10-20&uploadedTo=2026-10-20&fileType=PDF',
);
```

Also test omission of blank keyword/folder filters, `ALL` type, missing response fields, and request abort signal forwarding.

- [x] **Step 2: Run the focused frontend test to confirm failure**

Run from `frontend`:

```powershell
npm run test -- tests/archive-board-service.test.ts
```

Expected: test failure because the current service requires offset/limit.

- [x] **Step 3: Implement filter types and query serialization**

Define the following contract and use it in the service and hook:

```ts
export type ArchiveFileType =
  | 'ALL'
  | 'DOCUMENT'
  | 'SPREADSHEET'
  | 'PRESENTATION'
  | 'PDF'
  | 'IMAGE'
  | 'VIDEO'
  | 'ARCHIVE';

export type ArchiveFileSearchFilters = {
  keyword: string;
  folderCode: string;
  uploadedFrom: string;
  uploadedTo: string;
  fileType: ArchiveFileType;
};
```

Change `fetchArchiveFiles(filters, signal?)` to omit empty optional query values and omit `fileType=ALL`. Preserve response normalization and explicit failure behavior.

- [x] **Step 4: Convert the list hook to complete-result loading**

Replace `F1GridDataSource` state with `{ rows, isLoading, error, retry }`, issue one fetch for the active filters, and ignore stale responses using a request sequence or abort controller. Initialize the active filters as follows:

```ts
const today = dayjs();
const initialFilters: ArchiveFileSearchFilters = {
  keyword: '',
  folderCode: '',
  uploadedFrom: today.subtract(1, 'year').format('YYYY-MM-DD'),
  uploadedTo: today.format('YYYY-MM-DD'),
  fileType: 'ALL',
};
```

A cleared date stays an empty string and is omitted from the request. A failed request must set an error, not an empty success result.

- [x] **Step 5: Run service and hook tests**

Update the hook assertion so one filter submission requests the full result set and no offset/limit parameters. Run `npm run test -- tests/archive-board-service.test.ts`; expected: all service and hook tests pass.

## Task 4: Implement grouped file-browser rows, search controls, and authorized actions

**Files:**
- Modify `frontend/src/pages/groupware/community/archive/ArchiveBoardPage.tsx`
- Modify `frontend/src/pages/groupware/community/archive/components/ArchiveFileGrid.tsx`
- Modify `frontend/src/pages/groupware/community/archive/hooks/useArchiveCategories.ts`
- Modify `frontend/src/pages/groupware/community/archive/types/archive.types.ts`
- Create `frontend/src/pages/groupware/community/archive/components/ArchiveFileEditDialog.tsx`
- Test `frontend/tests/archive-page.test.tsx`; add `frontend/tests/archive-file-grid.test.tsx` if needed for isolated row actions.

- [x] **Step 1: Write failing page tests**

Cover initial last-year dates and `ALL`; detailed search date/type submission; root folder and file sections; clicking a folder and returning via breadcrumb; folder list remaining present when file type/date filters change; create buttons visible only to tenant-admin users with create permission; edit and delete actions gated by update/delete permission; and uploads still start immediately with independent per-file outcomes.

- [x] **Step 2: Run the focused page test to confirm failure**

Run `npm run test -- tests/archive-page.test.tsx`. Expected: existing chip-filter/F1Grid assertions fail for the new search and grouped rows.

- [x] **Step 3: Add stable discriminated browser rows**

Represent section, folder, and file rows with this discriminated shape and stable `rowKey`:

```ts
type ArchiveBrowserRow =
  | { rowKey: 'section:folders' | 'section:files'; rowType: 'section'; label: string }
  | { rowKey: string; rowType: 'folder'; folderCode: string; folderName: string; active: boolean }
  | { rowKey: string; rowType: 'file'; file: ArchiveFileRow };
```

Use `folder:<itemCode>` and `file:<boardFileId>` as the non-section keys. Build root rows from all active and inactive categories filtered by the current keyword plus the server-returned file rows. Show inactive status and allow users to browse those folders, but keep their file actions read-only. For a folder location, display only its file section and file rows.

- [x] **Step 4: Render all rows locally in F1Grid**

Change `ArchiveFileGrid` to accept `rows: ArchiveBrowserRow[]`, not a server `dataSource`. Configure F1Grid as a local, read-only list:

```tsx
<F1Grid
  rows={rows}
  rowKey="rowKey"
  columns={columns}
  showCheckbox={false}
  disableSorting
  disableFiltering
  canExportExcel={false}
/>
```

Keep stable row keys and row virtualization. Render section headers across the row, folder-name buttons that enter a folder, file-type icons, responsive owner/date/size cells, and per-row actions. Do not modify the shared `FileView.tsx`, which has unrelated worktree changes.

- [x] **Step 5: Connect advanced search and folder navigation**

Use the shared `PageSearchArea` and `PageSearchField` shape for the integrated keyword field and detailed date/select controls. Configure detailed fields as:

```ts
const detailFields: PageSearchField[] = [
  { field: 'uploadedAt', label: '올린 날짜', type: 'date', searchSpan: 2 },
  {
    field: 'fileType',
    label: '유형',
    type: 'select',
    searchSpan: 1,
    options: [
      { value: 'DOCUMENT', label: '문서' },
      { value: 'SPREADSHEET', label: '스프레드시트' },
      { value: 'PRESENTATION', label: '프레젠테이션' },
      { value: 'PDF', label: 'PDF' },
      { value: 'IMAGE', label: '이미지' },
      { value: 'VIDEO', label: '비디오' },
      { value: 'ARCHIVE', label: '압축' },
    ],
  },
];
```

Keep detailed controls collapsed initially and show the active `최근 1년` summary. The select's built-in blank `전체` option maps to the API's `ALL` value; do not add a duplicate `ALL` menu option. Apply keyword/date/type together on search; keep location state separate so navigating folders preserves search constraints and reloads only the new location.

- [x] **Step 6: Connect folder management and file edit dialog**

Expose the `WF_ARCHIVE_CATEGORY` group ID and full common-code items from `useArchiveCategories`. Keep inactive categories visible and browseable, but allow only active categories as upload/move destinations. Show `새 폴더` only for tenant administrators with create permission; allow the common-code dialog to edit/reactivate items for tenant administrators with create or update permission. Use existing `CommonCodeItemHelpDialog`, `createCommonCodeItem`, and `updateCommonCodeItem`; reload category rows after save. Create `ArchiveFileEditDialog` with file name and destination (`루트` or active folder), validate `fileName.trim().length > 0` and `fileName.trim().length <= 200`, and save through `updateArchiveFile`. In an inactive folder, leave download enabled but disable file rename/move/delete and upload. Keep delete confirmation and request-in-progress disabling.

- [x] **Step 7: Run focused frontend tests**

Run:

```powershell
npm run test -- tests/archive-page.test.tsx tests/archive-board-service.test.ts
```

Expected: all tests pass for initial filter state, navigation, permissions, search request shape, row behavior, and uploads.

## Task 5: Update user documentation and verify the finished behavior

**Files:**
- Modify `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Modify `docs/result/20261020/community-archive-file-folder-grid/result.md`
- Add screenshots under `docs/result/20261020/community-archive-file-folder-grid/screenshots/`.

- [x] **Step 1: Update the F1-Grid archive reference**

Revise section 39 to describe local `rows`, section/folder/file row keys, one-response server search filters, no page or load-more controls, root/folder navigation, and current read-only file columns/actions. Do not change unrelated F1-Grid documentation.

- [x] **Step 2: Run targeted backend and frontend validation**

Run:

```powershell
cd backend
mvn -Dtest=ArchiveBoardServiceImplTest,ArchiveBoardApiControllerTest,ArchiveBoardTenantScopeMapperTest test
cd ..\frontend
npm run test -- tests/archive-page.test.tsx tests/archive-board-service.test.ts
npm run build
```

Expected: all selected Java tests and Vitest tests pass; TypeScript and Vite production build pass.

- [x] **Step 3: Verify browser layouts and screenshots**

Start `npm run dev`, then use the browser to verify the root and folder views, expanded detailed search, active recent-one-year summary, and permission-gated top-right actions at 375px, 768px, and 1280px. Check there is no page-level horizontal overflow and no page-number/load-more control. Save readable screenshots in the named result screenshots directory; do not include real tenant file names or personal data.

- [x] **Step 4: Record results and run final diff validation**

Update the result document with implementation summary, test/build commands and outcomes, MCP evidence or explicit MCP failure plus fallback evidence, and screenshot paths. Run `git diff --check` and review `git status --short`; preserve every unrelated pre-existing change.

## Execution constraints

- Start by setting only Task 1's documents and the archive-specific files above in scope. Do not modify shared `FileView.tsx`, document-writing pages/tests, notice pages, or other unrelated dirty files.
- Existing unrelated files are already modified or untracked, including document-writing `FileView` work and shared notice work. In the already-modified archive result and F1-Grid documentation files, integrate only the archive follow-up section and preserve all existing text and unrelated edits. Leave the pre-existing `.superpowers/brainstorm/file-view-skeleton/` directory untouched.
- No schema migration is planned. If MCP verification reveals that the documented API/data contract is wrong or a schema change becomes necessary, stop and ask before expanding scope.
- Search the archive endpoint consumers before removing pagination. If consumers outside the archive page exist, stop and ask before making the breaking API change.
