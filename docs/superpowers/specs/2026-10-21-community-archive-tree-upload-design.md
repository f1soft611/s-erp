# Community Archive Upload Fix and F1Tree Presentation

## Status

The user approved the two-root F1Tree layout that preserves the existing folder-filter behavior on 2026-10-21.

## Goal

Fix archive file uploads that currently fail with a generic data-processing error, and replace the archive file grid presentation with F1Tree hierarchy without changing archive search, navigation, permissions, or file actions.

## Evidence and root cause

- The user observed a selected `.xlsx` upload fail with `데이터 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.`
- `GlobalExceptionHandler` emits that message for an unrecognized `DataAccessException`.
- `ArchiveBoardServiceImpl.uploadFile` builds the post insert map using `postParams`, which supplies `lastModifiedBy` and `lastModifiedByName` but not `writerId` or `writerName`.
- `insertArchivePost` inserts both `writer_id` and `writer_name` from those missing map values.
- Read-only PostgreSQL metadata confirms `tb_board_post.writer_id` is NOT NULL. No tenant rows were queried.
- The missing writer ID explains the database error before the file upload flow reaches common-file persistence. Set writer metadata in the upload-specific insert map; do not modify unrelated post operations or schema.

## Approved tree presentation

Use F1Tree with two top-level section rows:

```text
폴더
  분류 1
  분류 2
  분류 3
파일
  파일 1
  파일 2
```

- Use stable row IDs and a parent key to connect folders/files to their respective section rows.
- Keep the folder and file icon treatment, file metadata columns, and permission-gated download/edit/delete actions.
- Selecting a category continues to set the current folder filter and show files matching that location, as in the existing file browser. It does not introduce nested folders or move files under category nodes in the tree.
- Keep the search filters, current-location behavior, inactive-folder read-only rules, and immediate multiple-file upload flow unchanged.
- Default-expand both sections so folders and files are visible when the page opens.

## Alternatives considered

- **Approved: section-root tree.** Changes only the visual organization and preserves existing interaction behavior.
- **Nested file tree.** Places files under category nodes, but changes navigation and result composition.
- **Tree sidebar plus file list.** Adds a second layout/state surface and does not match the requested presentation-only change.

## Scope and validation

- Backend change is limited to archive post creation writer metadata, with a service test asserting the insert values.
- Frontend change is limited to replacing the archive list's F1Grid wrapper with F1Tree and adding parent identifiers to its view rows.
- No database schema changes, new APIs, or unrelated screen changes.
- Run archive service/controller/mapper tests, archive page/service tests, and the frontend build.
- Verify the folder/file two-root hierarchy, folder filtering, upload request path, permissions, and responsive layouts in the browser.
- Update the F1-Grid reference and archive result document with the regression cause, fix, tests, and verification evidence.
