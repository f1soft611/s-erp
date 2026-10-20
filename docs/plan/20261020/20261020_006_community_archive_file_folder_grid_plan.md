# 20261020_006 Community Archive File/Folder Grid Implementation Plan

## 1. Goal

Convert `/groupware/community/archive` to a file-browser workflow using the current `tb_board_post`, `tb_common_file`, and `WF_ARCHIVE_CATEGORY` structures. Keep all changes scoped to the archive page, the common-code item dialog reuse surface, the archive API, and dated documentation.

## 2. Approved design and requirements

- Design: [Community Archive File and Folder Grid](../../superpowers/specs/2026-10-20-community-archive-file-folder-grid-design.md)
- Work instruction: [20261020_006 작업지시서](../directions/20261020/20261020_006_커뮤니티_자료실_파일폴더_그리드_개선_작업지시서.md)
- Existing API and tenant/permission contracts remain the baseline. Folder codes are flat `WF_ARCHIVE_CATEGORY` items; no new tables or columns are planned.
- `새 자료 등록` immediately opens the native file picker. Selected files upload without a composer; one file creates one post and one grid row, with `post.title` set to the normalized file name.
- Root files have null `category_code`; a folder upload uses the current folder code. Files can later be renamed and moved from active folders.
- Inactive folders/files remain visible and downloadable, but file upload, rename, move, and delete are disabled there.
- Existing multi-attachment posts are flattened into file rows. Moving one file from a multi-attachment post reassigns only that file to a new post and leaves the remaining attachments in place.
- Existing archive posts without active archive attachments are soft-deleted through a scoped, dated data-cleanup script. Do not modify notice or other board data.

## 3. Architecture

1. Add an archive file-row result and paged API query joining archive posts to active `tb_common_file` attachments. An omitted folder filter means root (`category_code IS NULL`); a specified code means that folder.
2. Add a single-file multipart create endpoint. The browser loops over selected files and presents each outcome independently. The endpoint creates the post from the filename, validates an optional active folder, uploads the file, and cleans up an empty post on failure.
3. Add a file metadata update endpoint for rename/move. It validates tenant and owner scope; for a single-file post it updates the post category/title as appropriate, and for one attachment in a legacy multi-file post it creates a new post and reassigns only that file.
4. Keep existing attachment download/delete ownership validation. Deleting the final active attachment soft-deletes its post.
5. Reuse `CommonCodeItemHelpDialog` for folder management, adding optional dialog/grid labels while preserving defaults for Draft Form Management. Share common-code item create/update API helpers instead of duplicating requests.
6. Replace the archive post composer/detail flow with a folder/file browser and a separate post-upload rename/move dialog.

## 4. File map

| File | Responsibility |
|---|---|
| `backend/src/main/java/egovframework/let/groupware/community/archive/controller/ArchiveBoardApiController.java` | File-list, direct upload, and file metadata update routes; retire post-only creation. |
| `backend/src/main/java/egovframework/let/groupware/community/archive/service/ArchiveBoardService.java` | File-oriented service contracts. |
| `backend/src/main/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImpl.java` | Tenant, board, category, upload, rename/move, delete and last-file cleanup rules. |
| `backend/src/main/java/egovframework/let/groupware/community/archive/domain/repository/ArchiveBoardDAO.java` | File-row query, counts, file/post metadata updates, and legacy file reassignment. |
| `backend/src/main/java/egovframework/let/groupware/community/archive/domain/model/ArchiveBoardFileItemVO.java` | File-oriented list/upload response. |
| `backend/src/main/java/egovframework/let/groupware/community/archive/domain/model/ArchiveBoardFileSearchVO.java` | Page, keyword, and current folder query. |
| `backend/src/main/java/egovframework/let/groupware/community/archive/domain/model/ArchiveBoardFileUpdateRequestVO.java` | File name and destination folder update request. |
| `backend/src/main/resources/egovframework/mapper/let/groupware/community/archive/ArchiveBoard_SQL_postgresql.xml` | File/post join query, file count, direct upload metadata, rename/move, reparent and soft-delete SQL. |
| `backend/src/main/java/egovframework/let/groupware/community/archive/domain/model/ArchiveBoardPostSaveRequestVO.java` and post-only create/update service/controller methods | Remove or retire after confirming the repository has no other consumers; only the file-upload endpoint may create posts. |
| `backend/src/test/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImplTest.java` | Archive service behavior and authorization regression tests. |
| `backend/src/test/java/egovframework/let/groupware/community/archive/controller/ArchiveBoardApiControllerTest.java` | Multipart and file update route/status/envelope tests. |
| `backend/src/test/java/egovframework/let/groupware/community/archive/mapper/ArchiveBoardTenantScopeMapperTest.java` | SQL tenant/archive/attachment-scope assertions. |
| `frontend/src/pages/groupware/community/archive/ArchiveBoardPage.tsx` | Compose folder browser, search, direct upload, common-code dialog and file actions. |
| `frontend/src/pages/groupware/community/archive/components/ArchivePostGrid.tsx` → `ArchiveFileGrid.tsx` | Replace post columns with file rows, folder navigation, download and permission-gated row actions; update page imports. |
| `frontend/src/pages/groupware/community/archive/components/ArchivePostDetail.tsx` | Remove obsolete post-detail flow after confirming no remaining archive consumer. |
| `frontend/src/pages/groupware/community/archive/components/ArchiveComposerDialog.tsx` | Remove obsolete metadata composer after confirming no remaining archive consumer. |
| `frontend/src/pages/groupware/community/archive/components/ArchiveFileEditDialog.tsx` | Explicit post-upload filename/folder edit dialog. |
| `frontend/src/pages/groupware/community/archive/hooks/useArchiveCategories.ts` | Load active and inactive categories, exposing active upload destinations separately. |
| `frontend/src/pages/groupware/community/archive/hooks/useArchiveList.ts` | Paged file rows scoped to root or selected folder. |
| `frontend/src/pages/groupware/community/archive/hooks/useArchiveMutations.ts` | Upload each file independently; rename/move/delete and retry/error state. |
| `frontend/src/pages/groupware/community/archive/services/archiveBoardService.ts` | File-list/upload/update/download/delete requests and response validation. |
| `frontend/src/pages/groupware/community/archive/types/archive.types.ts` | File row, page, and update types. |
| `frontend/src/shared/components/common-code/CommonCodeItemHelpDialog.tsx` | Add optional dialog title and grid label with current defaults unchanged. |
| `frontend/src/pages/co/master/common-code/services/commonCodeManagement.service.ts` | Shared common-code item create/update helpers. |
| `frontend/src/pages/co/workflow/form/services/draftFormManagement.service.ts` | Reuse shared common-code item helpers without changing Draft Form behavior. |
| `frontend/tests/archive-page.test.tsx` | Root/folder browsing, upload picker, file actions, and permission UI tests. |
| `frontend/tests/archive-board-service.test.ts` | File API serialization, paging, upload and category loading tests. |
| `frontend/tests/common-code-item-help-dialog.test.tsx` | Default and custom title/grid label compatibility. |
| `frontend/tests/common-code-management.service.test.ts` | Shared common-code item create/update request tests. |
| `frontend/src/pages/f1-grid-docs/F1-GRID.md` | Document the archive's file/folder grid behavior; read and integrate the existing worktree edits before changing. |
| `backend/DATABASE/20261020/` and `docs/database/20261020/` | Paired cleanup SQL, change history, and rollback files for empty archive posts. |
| `docs/result/20261020/community-archive-file-folder-grid/` | Implementation result and responsive screenshots. |

## 5. Implementation sequence

1. **Backend file listing:** write failing service/mapper/controller tests; implement tenant/archive-scoped file rows and pagination, with root and folder filters.
2. **Direct upload:** test multipart validation, filename-derived title, optional folder, category validation, upload failure cleanup, and rejection of the retired post-only creation route; implement one-file upload and retire fileless post creation.
3. **Rename/move/delete:** test active/inactive category behavior, file ownership, legacy multi-attachment reparenting, and final attachment cleanup; implement metadata updates without moving storage objects.
4. **Data cleanup:** author paired dated soft-delete SQL/history/rollback files. Before any execution, inspect only aggregate affected-row counts through the permitted read-only MCP path and verify the deployment/backup checkpoint. Do not apply DML through MCP or an unapproved production connection.
5. **Shared common-code dialog:** add optional archive title/grid label, extract shared item create/update helpers, and retain draft-form defaults through tests.
6. **Frontend browser:** replace post rows/details/composer with folder navigation, paged file rows, file picker upload, separate rename/move dialog, and permission-aware actions.
7. **Integration verification:** run focused Vitest and Maven selectors, frontend build, `git diff --check`, and browser checks at 375px/768px/1280px. Write result documentation and screenshots.

## 6. Validation and safety

- Frontend:
  - `npm run test -- tests/archive-page.test.tsx tests/archive-board-service.test.ts tests/common-code-item-help-dialog.test.tsx tests/common-code-management.service.test.ts`
  - `npm run build`
- Backend, from `backend`:
  - `mvn -Dtest=ArchiveBoardServiceImplTest,ArchiveBoardApiControllerTest,ArchiveBoardTenantScopeMapperTest test`
- Keep existing unrelated edits intact. Before touching a dirty file, read its current content and integrate its changes; stage only explicit archive/doc files.
- No schema DDL is planned, so `docs/database/db-schema.md` changes only if implementation reveals a real schema difference. The dated data cleanup history still must be paired in both database directories.
- Actual DB cleanup is not part of local tests and must not be applied through the read-only MCP. If the allowed MCP cannot provide a non-sensitive aggregate check, record that limitation and stop before cleanup execution.
