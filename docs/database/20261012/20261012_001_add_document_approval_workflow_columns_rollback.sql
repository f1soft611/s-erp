-- Restore the intended 20261008_004 event baseline and original approval checks.
-- New workflow data must be migrated or reviewed before rollback.

BEGIN;

DO $rollback$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.tb_electronic_approval_main
        WHERE document_status = 'REJECTED'
    ) THEN
        RAISE EXCEPTION 'Cannot roll back while REJECTED approval documents exist';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.tb_electronic_approval_line_info
        WHERE pending_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Cannot roll back while approval pending_at values exist';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.tb_common_comment
        WHERE comment_type = 'SYSTEM'
          AND event_type IN ('SUBMITTED', 'RESUBMITTED', 'COMPLETED')
    ) THEN
        RAISE EXCEPTION 'Cannot roll back while new workflow system events exist';
    END IF;
END
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
                AND event_type IN ('APPROVED', 'REJECTED', 'RETURNED', 'DRAFT_SAVED')
            )
        );

ALTER TABLE public.tb_electronic_approval_line_info
    DROP CONSTRAINT chk_electronic_approval_line_action,
    ADD CONSTRAINT chk_electronic_approval_line_action
        CHECK (
            (
                participant_type = 'REFERENCE'
                AND action_status IS NULL
                AND action_at IS NULL
                AND action_comment IS NULL
            )
            OR
            (
                participant_type IN ('APPROVAL', 'AGREEMENT')
                AND (
                    (
                        action_status IN ('WAITING', 'PENDING')
                        AND action_at IS NULL
                        AND action_comment IS NULL
                    )
                    OR
                    (
                        action_status IN ('APPROVED', 'REJECTED', 'RETURNED')
                        AND action_at IS NOT NULL
                    )
                )
            )
        ),
    DROP COLUMN pending_at;

ALTER TABLE public.tb_electronic_approval_main
    DROP CONSTRAINT chk_electronic_approval_main_eabus_no,
    DROP CONSTRAINT chk_electronic_approval_main_document_status,
    ADD CONSTRAINT chk_electronic_approval_main_document_status
        CHECK (document_status IN (
            'DRAFT',
            'PENDING',
            'IN_PROGRESS',
            'REVISION_REQUESTED',
            'COMPLETED'
        )),
    DROP COLUMN eabus_no;

COMMIT;
