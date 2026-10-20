# Community Archive File and Folder Grid

## Status

The design direction was approved by the user on 2026-10-20. The user requested a file-centric archive grid while keeping the existing database tables. The user additionally specified that selecting `새 자료 등록` must open the file picker immediately and upload selected files without an information-entry form, and that uploaded files can later be renamed and moved between folders. This updated document is awaiting the user's review before implementation planning.

## Goal

Redesign `/groupware/community/archive` as a lightweight file browser. Archive categories act as flat folders, files appear one per row, and users can upload into a folder or directly into the archive root.

## Existing system evidence

- `tb_board_post` already contains `post_id`, `board_type_code`, `title`, nullable `category_code`, tenant and writer metadata, and soft-delete state.
- `tb_common_file` already contains the stored file name, size, uploader, tenant, owner type/id, usage type, creation time, and soft-delete state. The archive service associates a file with a post using `owner_type='ARCHIVE'` and `owner_id=post_id`.
- The archive page currently lists posts, and its list API returns one row per post with an attachment count. The save service currently requires both a title and a category, although the database category column is nullable.
- `WF_ARCHIVE_CATEGORY` is already used for archive categories. The existing `CommonCodeItemHelpDialog` supports adding and editing common-code items and is used by draft-form management.
- Read-only PostgreSQL MCP metadata confirmed the relevant table columns. No tenant rows, file rows, or other sensitive data were queried.

## Approved design

### Data model

- A folder is an item in the existing tenant-scoped `WF_ARCHIVE_CATEGORY` common-code group. Folders are flat; nested folders are out of scope.
- A file remains in `tb_common_file`; its owning `tb_board_post` continues to hold its tenant, board type, folder code, writer, and title. No folder or file table is added.
- Each newly uploaded file creates its own archive post and attachment. `tb_board_post.title` is populated from the original file name automatically; `contents` may be empty. The post's `category_code` is the selected folder code, or `NULL` for a direct upload to the root.
- The original file name remains the displayed name in `tb_common_file.file_name`. If it exceeds the current 200-character post-title validation limit, reject the upload with an actionable error rather than silently truncating the generated title.
- Clicking `새 자료 등록` immediately opens the native file picker. Selecting one or more files starts upload directly; there is no composer or additional information form.
- A multi-file selection creates one post and one visible file row per selected file. Each file result is reported independently so partial failures are explicit.
- Existing posts with multiple attachments remain intact. Their attachments are flattened into separate grid rows using `tb_common_file.file_name`, while the existing post remains the owner and supplies its folder and writer metadata.
- An upload without an actual file is rejected. If the final active attachment is deleted, its now-empty post is also soft-deleted.
- Renaming updates the file's displayed `tb_common_file.file_name`; when the owning post has only one active attachment, its `title` is kept in sync. For legacy posts with multiple attachments, renaming one file does not change the shared post title.
- Moving a file changes its owning post's `category_code` to the selected active folder code, or to `NULL` when moved to the root. The storage object key is unchanged.
- When moving one attachment out of a legacy post that has multiple active attachments, create a new archive post for that file using its file name and destination category, then change only that file's `owner_id`. Keep the original post and its other files intact; soft-delete the original post only if it has no active attachments left.

### Folder and file navigation

- The root view displays folder rows followed by uncategorized file rows.
- Selecting a folder opens that folder and displays its files with a breadcrumb/back navigation to the root. `새 자료 등록` uses the current location: uploading from the root leaves `category_code` empty; uploading inside a folder assigns its code.
- Upload state and per-file success/failure are displayed in the page; a failed upload is not reported as successful and can be retried.
- A `분류 추가` action opens the existing common-code item dialog for the `WF_ARCHIVE_CATEGORY` group. The dialog must present an archive-appropriate title while preserving its current draft-form title and behavior for existing callers.
- Each file's more-actions menu provides `이름/폴더 변경`, opening a separate edit dialog with the file name and destination folder. This is an explicit post-upload operation; new registration still has no information-entry dialog.
- Folder-item editing follows the existing tenant-admin and page create/update permission pattern.
- Inactive folders remain visible and browsable as read-only locations so their existing files remain accessible. Only download is allowed for files in inactive folders; upload, rename, move, and delete are blocked until the folder is reactivated.
- The list columns are name, owner, uploaded date, size, and row actions. Folder rows show folder icons and `—` for size; file rows show file name, file size, and download plus permission-gated rename/move/delete actions. Owner is taken from the owning post's writer metadata; upload date and size come from the individual file record.
- Search covers file name and owner within the current location. The screenshot's star is not implemented as a favorite control.

### API and authorization

- Replace or adapt the current post-oriented list response with a file-oriented result containing one row per active archive attachment, including the post ID and file ID needed for folder scope, downloads, and deletion.
- Every list, upload, delete, and download operation remains tenant-scoped and restricted to `board_type_code='ARCHIVE'` and archive attachment ownership.
- Category values are validated against the tenant's `WF_ARCHIVE_CATEGORY` group. Root uploads accept a null category; inactive categories cannot receive new files.
- File creation and post metadata creation use a single workflow that does not leave an empty visible post when an upload fails. Errors are surfaced, and successful files in a multi-file batch remain distinguishable from failed files.
- Rename/move requests validate the file and owning post in the authenticated tenant, validate any target folder as an active `WF_ARCHIVE_CATEGORY` item, and update only file display metadata and the owning post's folder metadata. A single attachment moved out of a legacy multi-file post is reassigned to a new post; its storage object is not copied.
- Existing administrator checks remain enforced by the server, not only by hiding UI actions.

### Existing data cleanup

- Existing archive posts with no active `ARCHIVE` attachments are removed from the visible archive by setting `is_deleted='Y'`.
- Cleanup is limited to `board_type_code='ARCHIVE'` and the applicable tenant scope. Notice posts and other board types are not changed.
- The cleanup is soft deletion; post and file rows are not physically deleted.
- The dated SQL/change-history/rollback process must make the data cleanup reviewable and follow the repository's database change-management rules.

## Approaches considered

1. **Join existing posts and file records, flattening attachments into rows (selected).** Reuses `tb_board_post` for owner/folder metadata and `tb_common_file` for each actual file. It preserves existing multi-attachment records and needs no new table.
2. **Create one post for every historical attachment.** This duplicates post metadata and requires transforming existing records; it is unnecessary because the current file table already provides one row per file.
3. **Add dedicated folder/file tables.** This models a general file manager directly but increases schema and migration scope, contrary to the request to keep current tables.

## Scope boundaries

Included:

- Archive page file/folder navigation and file-oriented grid.
- Common-code folder management through the existing item dialog.
- Direct-to-file-picker, per-file upload, list, download, and delete behavior using the current tables.
- Archive API/service changes to support file-row responses, root uploads, and required-file validation.
- Per-file rename and folder move using existing file/post metadata.
- Soft deletion of existing archive posts with no active attachment.
- Focused frontend/backend tests, responsive browser verification, and dated result documentation.

Excluded:

- Nested folders, a separate file/folder table, and a new common-code group.
- Favorite/bookmark behavior, previews, bulk download, comments, and rich-text content.
- Notice-page changes or a general-purpose file-management framework.

## Validation

- Backend tests cover file-oriented listing, root and folder filtering, auto-filled titles, file-required validation, partial upload failures, rename/move metadata synchronization, last-file deletion, inactive folders, tenant scope, attachment ownership, and authorization.
- Frontend tests cover root and folder navigation, common-code item management, file columns, immediate multi-file upload outcomes, rename/move, download/delete actions, and error/retry behavior.
- Run the focused frontend tests and build, and focused backend tests. Verify browser layout at 375px, 768px, and 1280px, including grid scrolling, breadcrumb behavior, and upload controls.
- Record results and screenshots under a dated `docs/result` directory following the repository's English-lowercase path convention.
