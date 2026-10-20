# Community Archive Search and Layout Redesign

## Status

Approved in conversation on 2026-10-20. The user selected the grouped folder/file list layout and approved the search, permission, error-handling, and validation design. This document is awaiting the user's review before implementation planning.

## Goal

Update `/groupware/community/archive` to present folders and files in a file-browser list aligned with the document-writing file list reference, and add integrated keyword, upload-date, and file-type search. Keep the existing archive database tables and folder model.

## Existing system evidence

- The archive uses `tb_board_post`, `tb_common_file`, and tenant-scoped `WF_ARCHIVE_CATEGORY` common-code items; no new folder or file table is required.
- The current archive list API is server-paged (`offset`/`limit`) and already returns `mimeType`, file name, owner, upload date, and size per file.
- The current page uses a folder chip filter and `F1Grid`. `useArchiveList` and `archiveBoardService` pass keyword and folder filters to the API.
- The document-writing `FileView` is a responsive file-row list with name, owner, upload date, and size columns. It uses incremental loading; that behavior is intentionally not copied because the user requested all matching archive results at once.
- `CommonCodeItemHelpDialog` supports creating and editing common-code items and is used by draft-form management. Folder management can reuse it with archive-specific title and permissions.
- The existing archive implementation already supports file-specific upload, update, download, and delete APIs. File rename/move actions are not yet exposed in the current archive UI.

## Approved design

### Page layout and navigation

- Use the selected grouped-list design: show a `폴더` section followed by a `파일` section at the root.
- A folder row opens that flat folder and displays `자료실 > 폴더명` navigation with a way back to the root. Inside a folder, show only its files; nested folders are out of scope.
- Use columns `이름`, `소유자`, `올린 날짜`, `크기`, and `작업`. Folder rows display a folder icon and `—` for size. File rows display an icon based on file type and show the file's owner, uploaded date, and size.
- Keep existing file actions available according to permission: download, rename/move, and delete. Do not add favorites; the screenshot's star is not part of the approved behavior.
- Show `파일 업로드` and `새 폴더` actions at the top right only when the tenant administrator has the page create permission. Upload opens the native file picker immediately and uploads selected files without extra metadata entry.
- Reuse the existing common-code item management dialog for folder creation/management, with an archive-specific title. Respect the existing tenant-administrator and create/update permission checks for category editing.
- Preserve responsive behavior: at 375px, 768px, and 1280px, avoid page-level horizontal scrolling and keep file names and row actions usable.

### Search and result behavior

- Replace the folder chips with a common search row containing an integrated keyword field for file name/owner and a `상세검색` toggle.
- Detailed search contains an uploaded-date range and file type selection: `전체`, `문서`, `스프레드시트`, `프레젠테이션`, `PDF`, `이미지`, `비디오`, and `압축`.
- Keep detailed search collapsed initially, but show its active date summary (`최근 1년`) so the default constraint is visible. Apply the most recent one-year date range automatically on initial entry. The user can change the start and end dates in detailed search and apply them with the search action.
- Either date boundary may be cleared to make that side of the range open-ended. Clearing both boundaries removes the date constraint; when both are present, reject a start date later than the end date.
- Search applies within the current location. At the root, keyword search may filter folder names; date and file-type filters apply only to files, so folders remain navigable regardless of those filters.
- Listing an inactive folder is allowed for reading existing files. The query remains tenant/archive scoped, and invalid or foreign folder codes return no rows. Upload and file-update operations continue to validate that destination folders are active.
- File type classification uses stored MIME type first and the file extension as a fallback. Unknown types remain available under `전체` and are not assigned to a named type without evidence.
- Use these extension groups as the fallback when MIME type is missing or generic: documents (`doc`, `docx`, `hwp`, `hwpx`, `odt`, `rtf`, `txt`, `md`, `htm`, `html`, `xml`, `json`, `sql`); spreadsheets (`xls`, `xlsx`, `xlsm`, `ods`, `csv`); presentations (`ppt`, `pptx`, `odp`); PDF (`pdf`); images (`png`, `jpg`, `jpeg`, `gif`, `webp`, `svg`, `bmp`, `tif`, `tiff`); videos (`mp4`, `mov`, `avi`, `mkv`, `webm`, `m4v`, `wmv`); archives (`zip`, `rar`, `7z`, `tar`, `gz`, `bz2`, `xz`). A known non-generic MIME type takes precedence over the filename extension.
- Do not show page numbers or incremental loading. Return all matching files for the current folder and search criteria in one response, ordered by most recently uploaded first.
- Add server-side date and type filters to the archive file-list API so results remain correct and consistent for all matching files. Remove pagination requirements from this archive screen's request contract; other API consumers must be checked before changing the endpoint.
- Date boundaries use inclusive calendar dates for the user's selected start and end dates. The backend must include the full end date when filtering timestamp values.

### Permission, mutation, and error behavior

- Keep upload permission-gated and immediately open the file picker. For multiple selected files, upload each separately and show each file's success or failure; do not imply a failed upload succeeded.
- Expose rename/move only to users with update permission and delete only to users with delete permission. Download remains subject to the existing read access and tenant/ownership checks.
- Reuse existing confirmation for deletion and prevent duplicate requests while a row operation is active.
- Files in inactive folders remain readable/downloadable, but file upload, rename, move, and delete are unavailable while the folder is inactive. Users with category-management permission can still manage the common-code item and reactivate the folder.
- Show explicit loading, error, empty-result, and mutation states. Search or loading failures must not fall back to an unfiltered or success-shaped result.

## API and data changes

- Keep the existing database tables and common-code folder model; this design does not request a schema migration.
- Extend the archive file-list query with uploaded-date start/end and file-type criteria, in addition to keyword and folder location.
- The archive list should return all matching file rows in one response and retain an accurate result count. Remove `offset`/`limit` from the archive screen flow after checking for other callers.
- File-type filtering must use the individual file metadata (MIME type and fallback extension), not post title or folder code.
- Before implementation, verify the current table/API contract with the workspace PostgreSQL read-only MCP as required by project instructions. Do not query or record tenant file rows or other sensitive data.

## Testing and acceptance criteria

- API/service tests cover inclusive date boundaries, each supported type filter, unknown types under `전체`, current-folder filtering, root files, and complete results without pagination.
- Frontend tests cover default one-year dates, keyword and detailed search submission, folder navigation, root/folder result composition, permission-gated actions, and per-file upload outcome display.
- Run the relevant frontend and backend tests and the frontend build.
- Verify actual browser rendering at 375px, 768px, and 1280px, including root view, folder view, and expanded detailed-search controls. Record screenshots and findings in the dated result document.
- Keep the F1-Grid documentation aligned with the changed archive list behavior; write the dated direction, plan, detailed specification, and result following repository documentation rules.

## Scope exclusions

- No new archive tables or common-code groups.
- No nested folders, favorites, previews, bulk download, or metadata-entry upload form.
- No changes to other community boards or the document-writing file list.
