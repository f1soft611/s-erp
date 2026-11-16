-- Extend the supported shared notification event/source pair for approval workflow events.
-- Reference migration only. Do not execute automatically or apply to an existing database.

BEGIN;

ALTER TABLE public.tb_notification
    DROP CONSTRAINT IF EXISTS chk_notification_event_source;

ALTER TABLE public.tb_notification
    ADD CONSTRAINT chk_notification_event_source
    CHECK (
        (event_type = 'APPROVAL_COMMENT_MENTION' AND source_type = 'APPROVAL_COMMENT')
        OR (event_type = 'DIRECT_MESSAGE_RECEIVED' AND source_type = 'DIRECT_MESSAGE')
        OR (event_type = 'APPROVAL_WORKFLOW' AND source_type = 'APPROVAL_STATUS_EVENT')
    );

COMMIT;
