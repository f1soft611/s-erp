-- Add per-recipient soft archive support for shared notifications.
-- Reference migration; do not execute through the read-only MCP.

BEGIN;

ALTER TABLE public.tb_notification
    ADD COLUMN archived_at TIMESTAMP;

CREATE INDEX idx_notification_active_page
    ON public.tb_notification (tenant_id, recipient_user_id, created_at DESC, notification_id DESC)
    WHERE archived_at IS NULL;

CREATE INDEX idx_notification_active_unread
    ON public.tb_notification (tenant_id, recipient_user_id)
    WHERE read_at IS NULL AND archived_at IS NULL;

COMMIT;
