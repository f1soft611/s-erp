# 20261015_005 Community Archive Detailed Specification

## Status

This specification records the approved community archive design and the implementation-level contracts for review. Implementation and database migration remain blocked until the user reviews this document and confirms the shared-worktree/database gate.

## References

- Work instruction: [20261015_005_커뮤니티_자료실_작업지시서.md](../../directions/20261015/20261015_005_커뮤니티_자료실_작업지시서.md)
- Implementation plan: [20261015_005_community_archive_implementation_plan.md](../../plan/20261015/20261015_005_community_archive_implementation_plan.md)
- Approved design: [2026-10-15-community-archive-design.md](../../superpowers/specs/2026-10-15-community-archive-design.md)

## 1. Purpose and scope

Provide a tenant-isolated community archive at `/groupware/community/archive`. Authenticated users can find and download shared materials. Administrators allowed by the existing archive board configuration can create, edit, and delete posts and manage multiple attachments per post.

The work also closes the existing tenant-scope gap for notice posts. Notice URL and JSON contracts remain compatible; the stored category is migrated from `notice_gubun_code` to the shared `category_code` column.

Included: archive UI and API, common-code category validation, tenant-scoped notice/archive post operations, a guarded database migration, tests, responsive browser verification, and result documentation.

Excluded: new menu or board-type seed rows, category administration, rich text or embedded images, previews, comments, likes, bookmarks, bulk download, and a generic-board refactor.

## 2. Verified existing state and constraints

- `tb_board_type` already has the active `ARCHIVE` type configured for all-user reads, administrator writes, and file uploads. The `GW_ARCHIVE` menu and `/groupware/community/archive` route already exist. Do not create duplicate rows.
- `tb_board_post` currently has `notice_gubun_code` and no `tenant_id`.
- Existing Notice API clients use `noticeGubunCode`; that property name and the existing Notice routes must not change.
- `NOTICE_GUBUN` and `WF_ARCHIVE_CATEGORY` are tenant-scoped common-code groups. Only active items in the matching group are valid categories.
- Existing post authors cannot safely identify post ownership by tenant. Do not infer tenant ownership from author IDs.
- The current database evidence found exactly one tenant, but the migration must validate the tenant count again when it runs. Do not copy tenant row values or other sensitive data into code, tests, logs, or documentation.
- Menu and board configuration are not part of this migration.

## 3. Page and user interaction

### 3.1 Navigation and layout

The existing menu-derived `archive` key dispatches to a dedicated archive page in the dashboard. The page follows existing dashboard page-header, search, detail-panel, dialog, and loading/error patterns.

Use a responsive table/list optimized for comparing materials. Columns:

| Column | Value |
|---|---|
| Title | Post title; selecting the row opens its detail |
| Category | Label resolved from the active `WF_ARCHIVE_CATEGORY` items |
| Author | Writer display name |
| Registered | Post creation date |
| Files | Number of active attachments |

The list is newest-first and paginated. Search matches title, plain-text content, and author. A category filter uses the active common-code items returned by the API; labels and order are not hard-coded.

### 3.2 Detail and editor

- Selecting a row loads its detail and active attachment metadata in the existing detail-panel/overlay pattern.
- Detail displays title, category, author, registered date, and the multiline plain-text description.
- Each attachment has its own authenticated download action. Do not provide preview or bulk download.
- Administrators create/edit a post with a title, multiline plain-text description, one category, and zero or more files.
- Editing retains existing attachments unless the administrator explicitly removes them. New uploads and existing-file removals are handled as individual attachment operations.
- Post deletion uses the existing confirmation pattern. Deleting a post soft-deletes the post and cleans up its owned ordinary attachment records using the existing common-file service behavior.
- Serialize uploads and post deletion by locking the same tenant-owned post row inside their transactions. An upload waiting behind deletion must observe the deleted/missing post and fail; deletion must see uploads that completed before it acquired the lock.
- A newly created post is persisted before individual file uploads because each file is owned by a post ID. If any upload or removal fails, show the failed file operation and allow retry; do not report the entire operation as successful.

### 3.3 UI states and errors

The page must distinguish:

- Loading list/categories/detail.
- Successful list with rows, and successful empty list.
- List, category, or detail load error with an actionable retry.
- Save, delete, upload, attachment-removal, and download failure.
- Permission-denied state or hidden mutation actions when the user lacks the required permissions.

Do not convert failed requests into empty successful data. Preserve entered form data when a save fails. On 375px and 768px screens, prevent page-level horizontal overflow; if the table needs horizontal scrolling, confine it to the table container. Verify the detail overlay can be opened and closed at narrow widths.

## 4. Data and API contract

### 4.1 Shared post persistence

`tb_board_post` uses:

| Column | Meaning |
|---|---|
| `tenant_id` | Owning tenant; required for every post after migration |
| `board_type_code` | `NOTICE` or `ARCHIVE`; server-controlled |
| `category_code` | Category value from the board type's designated common-code group |
| `contents` | Post content |
| `contents_text` | Plain-text search content |

The archive accepts one plain-text `contents` value. The server persists that same text in `contents` and `contents_text`, keeping display and search content consistent. Archive does not use rich-text, embedded-image, HTML, or JSON content fields.

Notice preserves the external `noticeGubunCode` request/response property and maps it to `category_code` internally.

### 4.2 Category policy

| Board type | Required common-code group | Validation |
|---|---|---|
| `NOTICE` | `NOTICE_GUBUN` | Group belongs to the authenticated tenant and is active; submitted item belongs to it and is active |
| `ARCHIVE` | `WF_ARCHIVE_CATEGORY` | Group belongs to the authenticated tenant and is active; submitted item belongs to it and is active |

Reject a missing, inactive, unknown, or wrong-group category on create/update. Reject a supplied category filter if it is not an active item in the corresponding group. Do not accept tenant ID, board type, or category-group name from the client as authority; derive tenant from the authenticated user and board type from the endpoint/service.

### 4.3 Archive endpoints

All endpoints require authentication. Every database and file operation is scoped by the authenticated tenant. The archive service fixes `board_type_code` and common-file `owner_type` to `ARCHIVE`.

| Method and path | Request | Behavior |
|---|---|---|
| `GET /api/v1/groupware/boards/archive/posts` | `pageIndex`, `pageUnit`, optional `keyword`, optional `categoryCode` | Return the existing `ResultVO` envelope with `resultList` and `resultCnt`; keyword searches title/content/author; category is validated; order newest-first. |
| `GET /api/v1/groupware/boards/archive/posts/{postId}` | None | Return `{ item }` including active attachments owned by this tenant and post. |
| `POST /api/v1/groupware/boards/archive/posts` | `{ "title": "...", "contents": "...", "categoryCode": "..." }` | Administrator-only; validate required fields/category; return HTTP 201 with `{ item }`. |
| `PUT /api/v1/groupware/boards/archive/posts/{postId}` | Same fields as create | Administrator-only; update only a post owned by the tenant and archive board. |
| `DELETE /api/v1/groupware/boards/archive/posts/{postId}` | None | Administrator-only; soft-delete the tenant-owned archive post and clean up its owned ordinary attachments. |
| `POST /api/v1/groupware/boards/archive/posts/{postId}/attachments` | Multipart field `file` | Administrator-only; verify the tenant-owned post and upload-enabled board before saving; return HTTP 201 and attachment metadata. One request uploads one file. |
| `DELETE /api/v1/groupware/boards/archive/attachments/{boardFileId}?postId={postId}` | None | Administrator-only; soft-delete only a file owned by the authenticated tenant, archive board, and specified post. |
| `GET /api/v1/groupware/boards/archive/attachments/{boardFileId}/download?postId={postId}` | None | Authenticate and verify tenant, archive post, and file ownership before streaming the file. |

Use existing `ResultVO`, `ResponseStatusException`, and file-streaming conventions. Invalid payloads/categories return a client error; missing or non-owned posts/files do not disclose another tenant's data; unauthorized mutations are rejected. Storage and database errors must be surfaced rather than represented as success.

### 4.4 Tenant and ownership enforcement

- Resolve tenant ID from authenticated `LoginVO`; ignore any client-provided tenant value.
- Notice and Archive post list, count, detail, insert, update, pin, delete, and view-count operations include both tenant and board-type predicates as applicable.
- Notice view-history writes retain the authenticated tenant, and the corresponding post must first be confirmed under that tenant.
- Archive attachment reads, downloads, removals, and post cleanup require `tenant_id`, `owner_type='ARCHIVE'`, and the owning `postId`/file ID. Notice attachments retain `owner_type='NOTICE'` and their existing tenant checks.
- The archive upload and post-delete transactions serialize on the tenant-scoped archive post row to prevent active attachments from being left behind after post deletion.
- Frontend permission gating is UX only. The backend independently enforces administrator write policy and upload-enabled board configuration on every mutation.

## 5. Database migration and rollback

### 5.1 Forward migration

Create matching dated SQL, change-history, and rollback artifacts in `backend/DATABASE/20261015/` and `docs/database/20261015/`, and update `docs/database/db-schema.md`. Recheck the shared worktree and choose the next unused migration number only after the implementation gate.

The forward migration runs atomically:

1. Prevent concurrent tenant additions during the tenant-count check.
2. Require exactly one row in `tb_tenant`; raise an exception and roll back the entire migration if the count is zero or greater than one.
3. Rename `tb_board_post.notice_gubun_code` to `category_code`, retaining current category values.
4. Add nullable `tenant_id`, assign every existing post to the sole tenant, then make the column `NOT NULL`.
5. Add the FK to `tb_tenant(tenant_id)` and an index supporting tenant + board type + newest-first listing.

Do not run schema changes through the read-only database MCP. Do not apply the migration until the user confirms the implementation gate.

### 5.2 Rollback

Rollback removes the new index and FK, drops `tenant_id`, and renames `category_code` back to `notice_gubun_code`. Before dropping tenant ownership, it must abort if existing posts are assigned to more than one distinct tenant. This avoids silently collapsing tenant attribution if tenant-specific posts have been created after the forward migration. Document the rollback limitation and all affected objects in the dated change-history file.

## 6. Implementation boundaries

- Reuse dashboard routing/metadata, common-code lookup, `CommonFileService`, authentication, board configuration, and shared page/detail patterns.
- Keep the Archive controller/service/DAO/mapper and Archive UI separate from Notice-specific UI behavior.
- Introduce a small shared category validator used by Notice and Archive, mapping each fixed board type to its approved common-code group.
- Do not add menu/type seed rows or a generic-board abstraction.
- Preserve existing Notice API URLs and JSON field names.

Primary implementation paths are enumerated in the [implementation plan](../../plan/20261015/20261015_005_community_archive_implementation_plan.md).

## 7. Verification and acceptance criteria

### Backend

- Mapper tests prove all Notice post operations are tenant- and board-type-scoped, including detail, view-count, and view-history handling.
- Category validator tests cover active item acceptance and missing, inactive, and wrong-group rejection for both `NOTICE` and `ARCHIVE`.
- Archive mapper tests assert SQL tenant/board/owner predicates and the post-row lock used by upload/deletion; service/controller tests cover pagination/search/category, administrator-only writes, upload-enabled policy, post CRUD, file ownership, and tenant-safe download/removal.
- Migration review confirms tenant-count guard, transaction rollback on guard failure, not-null/FK/index, unchanged category values, and guarded rollback.
- Run focused tests for touched Notice and Archive code, then `mvn test`.

### Frontend

- Service tests cover endpoint/query/body serialization, `ResultVO` normalization, multipart upload, download/removal ownership parameters, common-code loading, and propagated errors.
- Page tests cover dashboard routing, list/search/category behavior, detail and attachments, per-file download, permission-gated actions, retries, and mutation feedback.
- Run focused Vitest tests and `npm run build`.

### Browser and result artifacts

Verify `http://127.0.0.1:4173/groupware/community/archive` at 375px, 768px, and 1280px. Check list/search/filter/detail/download and administrator actions when the environment permits; record authentication or API limitations rather than claiming unverified behavior. Store screenshots and a result report under `docs/result/20261015/community-archive/`.

## 8. Implementation gate

This document completes the documentation phase only. After user review, before changing code or database files:

1. Reinspect `git status --short`, the current `docs/database/db-schema.md` diff, and both `20261015` migration directories.
2. Preserve all concurrent work and verify the migration numbering remains available.
3. Report any DB-file conflict and stop for user guidance if the shared changes are not safe to proceed around.
4. Obtain the user's explicit confirmation to begin implementation.

No code, schema, or migration changes are authorized before that confirmation.
