-- Allow the document draft persistence event in the shared system-comment timeline.
-- This migration draft must be reviewed before it is applied.

BEGIN;

ALTER TABLE public.tb_common_comment
    DROP CONSTRAINT chk_tb_common_comment_event_type;

ALTER TABLE public.tb_common_comment
    ADD CONSTRAINT chk_tb_common_comment_event_type
    CHECK (
        (comment_type = 'USER' AND event_type IS NULL)
        OR
        (
            comment_type = 'SYSTEM'
            AND event_type IS NOT NULL
            AND LENGTH(BTRIM(event_type)) > 0
            AND event_type IN ('APPROVED', 'REJECTED', 'RETURNED', 'DRAFT_SAVED')
        )
    );

COMMIT;
