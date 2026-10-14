-- Remove the approval soft-delete contract only when it has no dependent data.

BEGIN;

LOCK TABLE public.tb_electronic_approval_main IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.tb_common_comment IN ACCESS EXCLUSIVE MODE;

DO $rollback$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.tb_electronic_approval_main
        WHERE deleted_yn = 'Y'
    ) OR EXISTS (
        SELECT 1
        FROM public.tb_common_comment
        WHERE owner_type = 'APPROVAL'
          AND comment_type = 'SYSTEM'
          AND event_type = 'DELETED'
    ) THEN
        RAISE EXCEPTION 'Cannot roll back while deleted approval documents exist';
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
                    'COMPLETED'
                )
            )
        );

ALTER TABLE public.tb_electronic_approval_main
    DROP CONSTRAINT chk_electronic_approval_main_deleted_yn,
    DROP COLUMN deleted_yn;

COMMIT;
