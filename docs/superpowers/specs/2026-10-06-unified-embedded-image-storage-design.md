# Unified Embedded Image Storage Design

## Goal

Use one temporary-upload, preview, promotion, ownership, and cleanup lifecycle for notice body images and drafting-work templates while keeping each feature's authorization and owner identity isolated.

## Current State

- Notice uploads directly to `tenant/{tenantId}/notice-temp/{uploadToken}/{fileName}` and creates `tb_common_file` metadata with `owner_type='NOTICE'` and the post ID. Its editor preview URL is presigned. The object is not promoted out of the temporary prefix, and repository evidence does not show an applied lifecycle rule for this prefix.
- Drafting forms upload to `drafting-work-form-temp`, promote by copying to a permanent prefix, insert `tb_common_file` metadata with `owner_type='DRAFTING_WORK_TEMPLATE'` and form ID, then rewrite template HTML/JSON to a stable authenticated endpoint.
- `tb_common_file` already contains `tenant_id`, `owner_type`, `owner_id`, `object_key`, `bucket_name`, `storage_provider`, `file_usage_type`, and `deleted_yn`; no schema change is required.

## Design

Add a domain-neutral backend embedded-image storage service that owns image validation, temporary object creation, temporary deletion, promotion/copy, `tb_common_file` insertion, transactional compensation, and stale-image cleanup. Use one tagged temporary prefix and one MinIO lifecycle tag for all embedded images. Promotion removes the tag and moves/copies the image to a durable object key before associating it with an owner.

Keep Notice and Draft controllers/services as thin domain adapters. They continue to enforce their own authorization, validate the target post/form, provide a server-selected owner type and owner ID, construct their stable authenticated image routes, and rewrite their own HTML/JSON. Never accept owner type or owner ID as trusted client authority. Persist embedded files using `file_usage_type='EMBEDDED'`; use `owner_type='NOTICE'` with post ID and `owner_type='DRAFTING_WORK_TEMPLATE'` with form ID.

Notice creation obtains its post ID before finalizing uploads inside the transaction. Notice create/update saves must rewrite both HTML and JSON to stable owner-checked URLs. Existing embedded images retained by an edit remain owned; removed images are soft-deleted transactionally and their MinIO objects are deleted after commit. Draft keeps its existing stable image endpoint and form authorization while delegating storage mechanics to the common service.

The browser preview URL may be short-lived because it is only for the editing session. Unsaved temporary objects are deleted on cancel, upload orphan, and successful save; a tagged MinIO lifecycle rule is the crash/offline cleanup backstop. Saved objects have no expiry tag and use stable authenticated application URLs, not stored presigned URLs or raw MinIO URLs.

## Alternatives Considered

1. Keep Notice's exact `notice-temp` object key after save and only associate metadata. This is closest to current behavior but leaves permanent content under a temporary prefix and requires lifecycle rules to distinguish owned from unowned objects.
2. Promote temporary objects to owner-scoped permanent keys through one shared service. This is selected because it meets the user's temporary-preview/permanent-save policy and provides one cleanup/transaction model.
3. Share only frontend upload controls while leaving backend persistence implementations separate. This does not resolve lifecycle drift and is rejected.

## Validation

- Unit tests cover generic temporary upload metadata, owner-scoped promotion, token/tenant checks, rollback compensation, deletion, and retained/removed owner records.
- Notice and Draft integration tests cover their distinct owner types/IDs, stable URL rewriting in HTML/JSON, create/update/save behavior, and temporary cleanup.
- Existing image paste, rehydration, edit, delete, and authorization tests remain green.
- Frontend focused tests/build and backend focused Maven tests/build are required. MinIO lifecycle application is an operator action; document the exact tag/prefix rule and report whether the live rule is verified without changing bucket policy from application code.

## Scope

- No new database table or column.
- No raw MinIO URL is persisted in body HTML/JSON.
- No client-controlled owner fields.
- No changes to ordinary attachment ownership or API behavior outside embedded images.
