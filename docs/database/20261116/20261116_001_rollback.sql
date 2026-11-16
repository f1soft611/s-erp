-- Remove approval workflow notifications before restoring the original event/source constraint.
-- Reference rollback only. Do not execute automatically or apply to an existing database.

BEGIN;

DELETE FROM public.tb_notification
WHERE event_type = 'APPROVAL_WORKFLOW'
  AND source_type = 'APPROVAL_STATUS_EVENT';

ALTER TABLE public.tb_notification
    DROP CONSTRAINT IF EXISTS chk_notification_event_source;

ALTER TABLE public.tb_notification
    ADD CONSTRAINT chk_notification_event_source
    CHECK (
        (event_type = 'APPROVAL_COMMENT_MENTION' AND source_type = 'APPROVAL_COMMENT')
        OR (event_type = 'DIRECT_MESSAGE_RECEIVED' AND source_type = 'DIRECT_MESSAGE')
    );

COMMIT;
