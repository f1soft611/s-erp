# Community Archive Upload and F1Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix archive file uploads by including the authenticated writer metadata in the required post insert and replace the archive list grid with the approved F1Tree presentation.

**Architecture:** Keep the archive API and database schema unchanged. Add writer ID/name only to the direct-upload post insert map; represent folders and files as child rows beneath two stable F1Tree section roots, preserving the current folder filter, search, permissions, icons, and file actions.

**Tech Stack:** Java 17, Spring Boot/eGovFrame, MyBatis, PostgreSQL, React, TypeScript, MUI, F1Tree, Vitest, JUnit 5, Playwright.

---

## File map

### Dated project documentation

- Create `docs/directions/20261021/20261021_001_커뮤니티_자료실_업로드_및_F1Tree_개선_작업지시서.md` with confirmed upload root cause, approved tree behavior, scope, and acceptance checks.
- Create `docs/plan/20261021/20261021_001_community_archive_upload_f1tree_plan.md` with the implementation sequence and exact test/build commands.
- Create `docs/spec/20261021/20261021_001_커뮤니티_자료실_업로드_F1Tree_상세사양서.md` with upload writer fields, tree row keys/parent relationships, preserved interactions, and test criteria.
- Update `docs/superpowers/specs/2026-10-21-community-archive-tree-upload-design.md` only if implementation evidence changes the approved behavior.

### Backend

- Modify `backend/src/main/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImpl.java` to add authenticated writer ID/name to the direct-upload post insert parameters only.
- Modify `backend/src/test/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImplTest.java` to assert authenticated writer metadata is passed before the file service call.
- No mapper, controller, database schema, or migration change is required.

### Frontend

- Modify `frontend/src/pages/groupware/community/archive/types/archive.types.ts` to include `parentId: string | null` for the discriminated browser rows.
- Modify `frontend/src/pages/groupware/community/archive/ArchiveBoardPage.tsx` to assign section rows as roots and folders/files as their children, retaining existing category click behavior.
- Modify `frontend/src/pages/groupware/community/archive/components/ArchiveFileGrid.tsx` to render the current columns and actions through `F1Tree` using `parentKey="parentId"` and `treeColumn="name"`.
- Modify `frontend/tests/archive-page.test.tsx` to assert tree section roots and folder navigation without weakening existing upload/search/action coverage.

### User-facing docs and results

- Update the archive section of `frontend/src/pages/f1-grid-docs/F1-GRID.md` with the F1Tree parent/child structure.
- Create `docs/result/20261021/community-archive-upload-f1tree/result.md` with root cause, implementation, test/build results, MCP evidence, and browser screenshots under `screenshots/`.

## Task 1: Validate dated work order, project plan, and detailed specification

**Files:**
- Create the three dated documents listed in the file map.

- [x] **Step 1: Record the approved scope and evidence**

Document the `writer_id` NOT NULL metadata and the upload insert map omission. Record that database rows were not queried and no schema/API changes are in scope.

- [x] **Step 2: Specify the F1Tree rows and preserved behavior**

Use stable `rowKey` values `section:folders`, `section:files`, `folder:<itemCode>`, and `file:<boardFileId>`. Set section `parentId` to `null`, folder parent to `section:folders`, and file parent to `section:files`. Specify that category selection still changes the current folder filter and that current-folder mode continues to show only the file section.

- [x] **Step 3: Self-check the dated documents**

Run `git diff --check`. Verify they align with the approved design and do not add nested folders, schema changes, API changes, or unrelated behavior.

## Task 2: Reproduce and fix the upload writer metadata omission

**Files:**
- Modify `backend/src/test/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImplTest.java`
- Modify `backend/src/main/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImpl.java`

- [ ] **Step 1: Extend the existing direct-upload test first**

In `directUploadCreatesArchivePostWithFileNameTitle`, extend the DAO argument assertion:

```java
verify(dao).insertArchivePost(argThat((Map<String, Object> params) ->
        "manual.txt".equals(params.get("title"))
                && params.get("categoryCode") == null
                && "test-admin".equals(params.get("writerId"))
                && "Test administrator".equals(params.get("writerName"))
                && "test-admin".equals(params.get("lastModifiedBy"))
                && "Test administrator".equals(params.get("lastModifiedByName"))));
```

- [ ] **Step 2: Run the test and confirm the expected failure**

Run from `backend`:

```powershell
mvn "-Dtest=ArchiveBoardServiceImplTest#directUploadCreatesArchivePostWithFileNameTitle" test
```

Expected: FAIL because `writerId` and `writerName` are absent from the direct-upload insert map.

- [ ] **Step 3: Add only the missing authenticated writer fields**

In `ArchiveBoardServiceImpl.uploadFile`, after creating `insertParams` from `postParams` and before inserting the post, add:

```java
insertParams.put("writerId", user.getId());
insertParams.put("writerName", user.getName());
```

Keep the existing last-modified fields and do not alter other post creation flows.

- [ ] **Step 4: Verify the focused backend test**

Run:

```powershell
mvn "-Dtest=ArchiveBoardServiceImplTest#directUploadCreatesArchivePostWithFileNameTitle" test
```

Expected: PASS; the file service is called with the inserted post ID and the result item is returned.

## Task 3: Convert archive rows to F1Tree while preserving behavior

**Files:**
- Modify `frontend/src/pages/groupware/community/archive/types/archive.types.ts`
- Modify `frontend/src/pages/groupware/community/archive/ArchiveBoardPage.tsx`
- Modify `frontend/src/pages/groupware/community/archive/components/ArchiveFileGrid.tsx`
- Modify `frontend/tests/archive-page.test.tsx`

- [ ] **Step 1: Add tree structure assertions to page tests**

In the root folder navigation test, assert the F1Tree disclosure buttons for both sections and assert folder/file rows remain present:

```tsx
expect(
  await screen.findByRole('button', { name: '폴더 접기' }),
).toBeInTheDocument();
expect(screen.getByRole('button', { name: '파일 접기' })).toBeInTheDocument();
expect(await screen.findByText('업무양식')).toBeInTheDocument();
expect(screen.getByRole('button', { name: '업무 가이드.pdf' })).toBeInTheDocument();
```

Keep the existing assertions that selecting a folder requests `folderCode: 'GUIDE'`, returning to the root requests `folderCode: ''`, and selecting files for immediate upload triggers upload.

- [ ] **Step 2: Run the focused page test and confirm the expected failure**

Run from `frontend`:

```powershell
npm run test -- tests/archive-page.test.tsx
```

Expected: FAIL because the grid does not yet render F1Tree section disclosure controls.

- [ ] **Step 3: Add parent IDs to the row type and row builder**

Add `parentId: string | null` to the browser row base. For the root location, set:

```ts
const foldersSectionId = 'section:folders';
const filesSectionId = 'section:files';
```

Assign `null` to each section, `foldersSectionId` to each folder row, and `filesSectionId` to each file row. For current-folder mode, keep only the file section root and its file children. Preserve the stable row keys already in use.

- [ ] **Step 4: Replace only the archive grid wrapper**

Import `F1Tree` and use:

```tsx
<F1Tree
  ariaLabel="자료실"
  rows={rows}
  columns={columns}
  rowKey="rowKey"
  parentKey="parentId"
  treeColumn="name"
  defaultExpandAll
  storageKey="groupware-community-archive-file-tree-v1"
  height="100%"
  minHeight={320}
  loading={loading}
  showCheckbox={false}
  disableSorting
  disableFiltering
  stripeRows
  canExportExcel={false}
  allowAddRowInContextMenu={false}
  allowDeleteRowInContextMenu={false}
  allowDuplicateRowInContextMenu={false}
  columnLine={false}
/>
```

Retain the column renderers and callbacks so file actions, icons, compact metadata, permissions, and category navigation remain unchanged.

- [ ] **Step 5: Run focused frontend tests**

Run:

```powershell
npm run test -- tests/archive-page.test.tsx tests/archive-board-service.test.ts
```

Expected: PASS for the tree roots/children, folder navigation, search, permissions, updates/deletes, inactive folders, and direct upload.

## Task 4: Verify, document, and capture the finished behavior

**Files:**
- Modify `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Create `docs/result/20261021/community-archive-upload-f1tree/result.md`
- Add screenshots under `docs/result/20261021/community-archive-upload-f1tree/screenshots/`

- [ ] **Step 1: Update F1-Grid documentation**

Replace the archive list description with the local F1Tree structure: root sections, child row keys/parent IDs, default expansion, folder selection behavior, and the preserved file columns/actions.

- [ ] **Step 2: Run targeted backend tests**

From `backend` run:

```powershell
mvn "-Dtest=ArchiveBoardServiceImplTest,ArchiveBoardApiControllerTest,ArchiveBoardTenantScopeMapperTest" test
```

Expected: all selected tests pass, including the upload writer metadata regression assertion.

- [ ] **Step 3: Run targeted frontend tests and production build**

From `frontend` run:

```powershell
npm run test -- tests/archive-page.test.tsx tests/archive-board-service.test.ts
npm run build
```

Expected: all focused tests pass and TypeScript/Vite build exits successfully.

- [ ] **Step 4: Verify browser behavior and responsive widths**

Use the existing S-ERP browser at `http://127.0.0.1:4173` only if authenticated state is already available; otherwise use browser API stubs and synthetic rows without entering credentials or accessing tenant data. Confirm the root section tree, folder filter transition, file-row actions, and upload request path. At 375px, 768px, and 1280px confirm no document-level horizontal overflow. Save synthetic-data screenshots in the named result directory.

- [ ] **Step 5: Record evidence and run final scope checks**

Record the cause/fix, tests/build, MCP metadata evidence, and screenshot paths in `result.md`. Run `git diff --check`; inspect `git status --short` and verify only archive changes and their required documents were added to this task.

## Execution constraints

- Work on the current branch; do not create a worktree or switch branches.
- Keep the fix to the direct-upload post insert map. Do not broaden writer metadata changes to other post flows.
- Keep F1Tree limited to visual row hierarchy; preserve folder filter navigation and file actions.
- Do not read `.env`, access real user credentials, or query tenant data rows.
- Do not change SQL/schema files; the MCP metadata confirms the current required writer field.
- Preserve all unrelated dirty worktree files.
