-- Remove cancellation events from the system event contract when unused.

BEGIN;

LOCK TABLE public.tb_common_comment IN ACCESS EXCLUSIVE MODE;

DO $rollback$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.tb_common_comment
        WHERE comment_type = 'SYSTEM'
          AND event_type IN ('SUBMISSION_CANCELED', 'APPROVAL_CANCELED')
    ) THEN
        RAISE EXCEPTION 'Cannot roll back while approval cancellation events exist';
    END IF;
END;
$rollback$;

ALTER TABLE public.tb_common_comment
    DROP CONSTRAINT chk_tb_common_comment_event_type,
    ADD CONSTRAINT chk_tb_common_comment_event_type
        CHECK (
            (comment_type = 'USER' AND event_type IS NULL)
            OR
            (
                comment_type = 'SYSTEM'
                AND event_type IS NOT NULL
                AND LENGTH(BTRIM(event_type)) > 0
                AND event_type IN (
                    'APPROVED',
                    'REJECTED',
                    'RETURNED',
                    'DRAFT_SAVED',
                    'SUBMITTED',
                    'RESUBMITTED',
                    'COMPLETED',
                    'DELETED'
                )
            )
        );

COMMIT;
