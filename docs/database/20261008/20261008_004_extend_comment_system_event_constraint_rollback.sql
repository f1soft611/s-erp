-- Roll back only 20261008_004_extend_comment_system_event_constraint.sql.
-- Existing DRAFT_SAVED events must be handled before restoring the old constraint.

BEGIN;

DO $rollback$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.tb_common_comment
        WHERE comment_type = 'SYSTEM'
          AND event_type = 'DRAFT_SAVED'
    ) THEN
        RAISE EXCEPTION 'Cannot roll back while DRAFT_SAVED system events exist';
    END IF;
END
$rollback$;

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
            AND event_type IN ('APPROVED', 'REJECTED', 'RETURNED')
        )
    );

COMMIT;
