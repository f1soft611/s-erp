# Community Archive Page Design

## Status

The user approved the design direction on 2026-10-15: table layout, post-based multi-file attachments, the existing `WF_ARCHIVE_CATEGORY` common-code group, and a shared post category column. Written-spec review is pending.

## Goal

Provide a usable archive page at `/groupware/community/archive` under `그룹웨어 > 커뮤니티 > 자료실`. Users can find shared materials and download their files. Authorized administrators can create, edit, and delete archive posts with multiple attachments.

## Existing system evidence

- `tb_board_type` already contains an active `ARCHIVE` row: `board_kind='archive'`, `menu_id=23`, `read_auth_level='ALL'`, `write_auth_level='ADMIN'`, and `file_upload_yn='Y'`. The `GW_ARCHIVE` menu and requested path already exist. Do not add duplicate menu or board-type rows.
- `tb_board_post` stores posts for all board types and currently has `notice_gubun_code`, a notice-specific category column.
- `tb_common_code_group` and `tb_common_code_item` contain the tenant-scoped common codes used by the application.
- `NOTICE_GUBUN` has three active categories. Its `ALL` and `IMPORTANT` entries are inactive and are not selectable categories.
- `WF_ARCHIVE_CATEGORY` is active and has three active items: 업무양식, 메뉴얼, 교육자료. The UI must use the common-code API values rather than hard-coding labels.
- Notice APIs are currently under a notice-specific route and use `noticeGubunCode`. Preserve this client contract while changing the internal storage mapping.

## Approved user experience

- Use a table/list layout optimized for finding and comparing files.
- Show title, category, author, registration date, and attachment count. Search by title, content, or author and filter by active archive category.
- Selecting a row opens the post detail in the existing shared detail-panel/overlay pattern. The detail shows the post description and each attachment with an individual download action.
- Create/edit forms capture a title, description, one active archive category, and multiple attachments. Deleting a post follows the existing confirmation pattern.
- On narrow screens, keep the table content usable without page-level horizontal overflow and use the established responsive detail overlay behavior.
- Reads are available to authenticated users according to the existing board configuration. Create, edit, delete, and upload are restricted by the archive board's administrator write policy; authorization is enforced on the server, not only by hiding buttons.

## Architecture and data flow

1. The menu-derived `archive` page key selects a dedicated archive page in the dashboard content router.
2. The archive page loads paginated posts and active `WF_ARCHIVE_CATEGORY` options through services. Search and category filters are sent to the archive API.
3. The archive API scopes reads and writes to the authenticated tenant and `ARCHIVE` board type. It validates a submitted category against active items in that tenant's `WF_ARCHIVE_CATEGORY` group.
4. Post descriptions use the existing board-post content fields. Attachments use the existing common file storage flow with owner type `ARCHIVE`; uploads and downloads remain associated with the post and tenant.
5. Notice posts and archive posts share one nullable `category_code` storage column. The board type determines which common-code group is valid: `NOTICE` maps to `NOTICE_GUBUN`, and `ARCHIVE` maps to `WF_ARCHIVE_CATEGORY`.
6. Existing notice JSON/property naming (`noticeGubunCode`) remains unchanged for compatibility; its persistence maps to `category_code`. The archive contract uses a generic `categoryCode`.

Implement archive-specific API/service surfaces using the existing notice and common-file patterns. Do not broaden this task into a full generic-board framework or move notice routes.

## Database and migration

- Rename `tb_board_post.notice_gubun_code` to `category_code`; retain current values during the rename.
- Update the board-post mapper/schema documentation and category persistence/query paths to use the shared column.
- Add paired dated SQL, change-history, and rollback files under `backend/DATABASE/20261015` and `docs/database/20261015`, and update `docs/database/db-schema.md`.
- The rollback renames `category_code` back to `notice_gubun_code`.
- Do not add a separate `archive_category_code` or a new category table. Do not recreate the already-present `ARCHIVE` type/menu seed.

## Error handling and authorization

- Reject unknown, disabled, or wrong-group category codes instead of saving an unvalidated value.
- Reject writes and uploads when the authenticated user does not meet the `ARCHIVE` board's write policy or uploads are disabled.
- Return normal API errors for unavailable posts, invalid attachments, and storage failures. The UI displays the error and allows retry; it must not present a failed operation as successful.
- Downloads are authorized against the requesting tenant, archive post, and attachment ownership.

## Validation

- Backend tests cover archive list/detail/create/update/delete, tenant and board scoping, category group validation, administrator-only writes, and attachment upload/download ownership.
- Frontend tests cover route rendering, common-code category options, search/filter requests, detail selection, per-file download, and administrator actions.
- Verify the page in a browser at 375px, 768px, and 1280px and capture the required result screenshots.
- Run focused tests and the frontend build; run backend tests for changed backend contracts and persistence.

## Out of scope

- Adding new menu or board-type rows when the existing configured rows are present.
- A separate category column per board type or category-management UI.
- Comments, likes, bookmarks, file previews, bulk download, and changes to notice endpoint URLs.
- Refactoring notice and archive into a general-purpose board engine.
