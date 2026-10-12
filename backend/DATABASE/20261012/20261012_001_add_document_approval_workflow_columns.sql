-- Add document numbering and active-step timestamps, and allow workflow events.
-- The live schema must be checked before this reviewed draft is applied.

BEGIN;

DO $migration$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.tb_electronic_approval_main
        WHERE document_type NOT IN (
            'DRAFTING',
            'BUSINESS_CONTACT',
            'EXPENSE_RESOLUTION',
            'ATTENDANCE_APPLICATION'
        )
    ) THEN
        RAISE EXCEPTION 'Cannot map eabus_no for an unsupported document_type';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.tb_electronic_approval_line_info
        WHERE participant_type IN ('APPROVAL', 'AGREEMENT')
          AND action_status IS NULL
    ) THEN
        RAISE EXCEPTION 'Cannot migrate approval lines with a missing action_status';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.tb_electronic_approval_line_info
        WHERE action_status = 'PENDING'
    ) THEN
        RAISE EXCEPTION 'Reconcile active approval timestamps before adding pending_at';
    END IF;
END
$migration$;

ALTER TABLE public.tb_electronic_approval_main
    ADD COLUMN eabus_no VARCHAR(3);

UPDATE public.tb_electronic_approval_main
SET eabus_no = CASE document_type
    WHEN 'DRAFTING' THEN '001'
    WHEN 'BUSINESS_CONTACT' THEN '008'
    WHEN 'EXPENSE_RESOLUTION' THEN '004'
    WHEN 'ATTENDANCE_APPLICATION' THEN '031'
END;

ALTER TABLE public.tb_electronic_approval_main
    ALTER COLUMN eabus_no SET NOT NULL,
    DROP CONSTRAINT chk_electronic_approval_main_document_status,
    ADD CONSTRAINT chk_electronic_approval_main_document_status
        CHECK (document_status IN (
            'DRAFT',
            'PENDING',
            'IN_PROGRESS',
            'REVISION_REQUESTED',
            'COMPLETED',
            'REJECTED'
        )),
    ADD CONSTRAINT chk_electronic_approval_main_eabus_no
        CHECK (
            (document_type = 'DRAFTING' AND eabus_no = '001')
            OR (document_type = 'BUSINESS_CONTACT' AND eabus_no = '008')
            OR (document_type = 'EXPENSE_RESOLUTION' AND eabus_no = '004')
            OR (document_type = 'ATTENDANCE_APPLICATION' AND eabus_no = '031')
        );

ALTER TABLE public.tb_electronic_approval_line_info
    ADD COLUMN pending_at TIMESTAMP,
    DROP CONSTRAINT chk_electronic_approval_line_action,
    ADD CONSTRAINT chk_electronic_approval_line_action
        CHECK (
            (
                participant_type = 'REFERENCE'
                AND action_status IS NULL
                AND pending_at IS NULL
                AND action_at IS NULL
                AND action_comment IS NULL
            )
            OR
            (
                participant_type IN ('APPROVAL', 'AGREEMENT')
                AND action_status IS NOT NULL
                AND (
                    (
                        action_status = 'WAITING'
                        AND pending_at IS NULL
                        AND action_at IS NULL
                        AND action_comment IS NULL
                    )
                    OR
                    (
                        action_status = 'PENDING'
                        AND pending_at IS NOT NULL
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
        );

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

COMMIT;
