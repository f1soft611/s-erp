-- Add auditable electronic approval cancellation events.
-- Apply only after reviewing the live PostgreSQL metadata and deployment order.

BEGIN;

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
                    'DELETED',
                    'SUBMISSION_CANCELED',
                    'APPROVAL_CANCELED'
                )
            )
        );

COMMIT;
