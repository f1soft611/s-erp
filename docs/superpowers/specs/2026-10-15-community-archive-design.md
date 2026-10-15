# Community Archive Page Design

## Status

The user approved the design direction on 2026-10-15: table layout, post-based multi-file attachments, plain-text descriptions, the existing `WF_ARCHIVE_CATEGORY` common-code group, a shared post category column, and tenant isolation for notices and archive posts. Existing posts are assigned to the sole current tenant only when a guarded migration confirms exactly one tenant. Written-spec review is pending.

## Goal

Provide a usable archive page at `/groupware/community/archive` under `그룹웨어 > 커뮤니티 > 자료실`. Users can find shared materials and download their files. Authorized administrators can create, edit, and delete archive posts with multiple attachments.

## Existing system evidence

- `tb_board_type` already contains an active `ARCHIVE` row: `board_kind='archive'`, `menu_id=23`, `read_auth_level='ALL'`, `write_auth_level='ADMIN'`, and `file_upload_yn='Y'`. The `GW_ARCHIVE` menu and requested path already exist. Do not add duplicate menu or board-type rows.
- `tb_board_post` stores posts for all board types and currently has `notice_gubun_code`, a notice-specific category column, but no `tenant_id`.
- The current DB contains exactly one tenant. Existing `writer_id` values do not provide a reliable tenant backfill mapping, so the migration must use the sole-tenant guard and stop if there is not exactly one tenant at execution time.
- `tb_common_code_group` and `tb_common_code_item` contain the tenant-scoped common codes used by the application.
- `NOTICE_GUBUN` has three active categories. Its `ALL` and `IMPORTANT` entries are inactive and are not selectable categories.
- `WF_ARCHIVE_CATEGORY` is active and has three active items: 업무양식, 메뉴얼, 교육자료. The UI must use the common-code API values rather than hard-coding labels.
- Notice APIs are currently under a notice-specific route and use `noticeGubunCode`. Preserve this client contract while changing the internal storage mapping.

## Approved user experience

- Use a table/list layout optimized for finding and comparing files.
- Show title, category, author, registration date, and attachment count. Search by title, content, or author and filter by active archive category.
- Selecting a row opens the post detail in the existing shared detail-panel/overlay pattern. The detail shows the post description and each attachment with an individual download action.
- Create/edit forms capture a title, a multiline plain-text description, one active archive category, and multiple attachments. Deleting a post follows the existing confirmation pattern.
- On narrow screens, keep the table content usable without page-level horizontal overflow and use the established responsive detail overlay behavior.
- Reads are available to authenticated users according to the existing board configuration. Create, edit, delete, and upload are restricted by the archive board's administrator write policy; authorization is enforced on the server, not only by hiding buttons.

## Architecture and data flow

1. The menu-derived `archive` page key selects a dedicated archive page in the dashboard content router.
2. The archive page loads paginated posts and active `WF_ARCHIVE_CATEGORY` options through services. Search and category filters are sent to the archive API.
3. Notice and archive APIs scope reads and writes to the authenticated tenant. Archive operations additionally require `board_type_code='ARCHIVE'`. Each validates a submitted category against active items in that tenant's type-specific common-code group.
4. Plain-text descriptions use the existing board-post content fields, including `contents_text` for search. Attachments use the existing common file storage flow with owner type `ARCHIVE`; uploads and downloads remain associated with the post and tenant.
5. Notice posts and archive posts share one nullable `category_code` storage column. The board type determines which common-code group is valid: `NOTICE` maps to `NOTICE_GUBUN`, and `ARCHIVE` maps to `WF_ARCHIVE_CATEGORY`.
6. Existing notice JSON/property naming (`noticeGubunCode`) remains unchanged for compatibility; its persistence maps to `category_code`. The archive contract uses a generic `categoryCode`.

Implement archive-specific API/service surfaces using the existing notice and common-file patterns. Do not broaden this task into a full generic-board framework or move notice routes.

## Database and migration

- Rename `tb_board_post.notice_gubun_code` to `category_code`; retain current values during the rename.
- Add a non-null `tenant_id` FK to `tb_board_post`. Backfill existing rows to the sole current tenant only inside a transaction that raises an error unless exactly one tenant exists. Do not infer tenant ownership from `writer_id`.
- Add an index supporting tenant + board type + newest-first post listing.
- Update both notice and archive board-post insert, list, count, detail, update, pin, and delete mapper statements to enforce tenant scope. New post writes use the authenticated tenant.
- Update the board-post mapper/schema documentation and category persistence/query paths to use the shared column.
- Add paired dated SQL, change-history, and rollback files under `backend/DATABASE/20261015` and `docs/database/20261015`, and update `docs/database/db-schema.md`.
- The rollback drops the new tenant index/FK/column and renames `category_code` back to `notice_gubun_code`.
- The rollback must abort if posts are assigned to more than one distinct tenant, so it cannot silently discard tenant ownership after tenant-specific posts exist.
- Do not add a separate `archive_category_code` or a new category table. Do not recreate the already-present `ARCHIVE` type/menu seed.

## Error handling and authorization

- Reject unknown, disabled, or wrong-group category codes instead of saving an unvalidated value.
- Reject writes and uploads when the authenticated user does not meet the `ARCHIVE` board's write policy or uploads are disabled.
- Return normal API errors for unavailable posts, invalid attachments, and storage failures. The UI displays the error and allows retry; it must not present a failed operation as successful.
- Existing post and view-history operations are tenant-scoped. Downloads are authorized against the requesting tenant, archive post, and attachment ownership.

## Validation

- Backend tests cover archive list/detail/create/update/delete, tenant and board scoping, category group validation, administrator-only writes, and attachment upload/download ownership.
- Frontend tests cover route rendering, common-code category options, search/filter requests, detail selection, per-file download, and administrator actions.
- Verify the page in a browser at 375px, 768px, and 1280px and capture the required result screenshots.
- Run focused tests and the frontend build; run backend tests for changed backend contracts and persistence.

## Out of scope

- Adding new menu or board-type rows when the existing configured rows are present.
- A separate category column per board type or category-management UI.
- Rich-text formatting, embedded images, comments, likes, bookmarks, file previews, bulk download, and changes to notice endpoint URLs.
- Refactoring notice and archive into a general-purpose board engine.
