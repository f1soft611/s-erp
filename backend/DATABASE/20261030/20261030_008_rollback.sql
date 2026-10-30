-- Rollback for 20261030_008_add_notification_archive.sql.
-- Archived notifications will become visible again after this rollback.

BEGIN;

DROP INDEX IF EXISTS public.idx_notification_active_unread;
DROP INDEX IF EXISTS public.idx_notification_active_page;

ALTER TABLE public.tb_notification
    DROP COLUMN IF EXISTS archived_at;

COMMIT;
