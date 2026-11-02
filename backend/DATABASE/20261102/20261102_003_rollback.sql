BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.tb_electronic_approval_line_info
        WHERE participant_type = 'FINAL_CONFIRMATION'
    ) THEN
        RAISE EXCEPTION 'Cannot roll back while FINAL_CONFIRMATION rows exist';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.tb_common_comment
        WHERE event_type = 'FINAL_CONFIRMATION_CONFIRMED'
    ) THEN
        RAISE EXCEPTION 'Cannot roll back while FINAL_CONFIRMATION_CONFIRMED events exist';
    END IF;
END;
$$;

DROP INDEX IF EXISTS public.uq_electronic_approval_line_participant;

DROP INDEX IF EXISTS public.uq_electronic_approval_line_final_confirmation;

ALTER TABLE public.tb_electronic_approval_line_info
    ADD CONSTRAINT uq_electronic_approval_line_participant
    UNIQUE (tenant_id, electronic_approval_id, participant_user_id);

ALTER TABLE public.tb_electronic_approval_line_info
    DROP CONSTRAINT IF EXISTS chk_electronic_approval_line_participant_type;

ALTER TABLE public.tb_electronic_approval_line_info
    ADD CONSTRAINT chk_electronic_approval_line_participant_type
    CHECK (participant_type IN ('APPROVAL', 'AGREEMENT', 'REFERENCE'));

ALTER TABLE public.tb_electronic_approval_line_info
    DROP CONSTRAINT IF EXISTS chk_electronic_approval_line_action;

ALTER TABLE public.tb_electronic_approval_line_info
    ADD CONSTRAINT chk_electronic_approval_line_action
    CHECK (
        (
            participant_type = 'REFERENCE'
            AND (
                (
                    action_status IS NULL
                    AND pending_at IS NULL
                    AND action_at IS NULL
                    AND action_comment IS NULL
                )
                OR (
                    action_status = 'CONFIRMED'
                    AND pending_at IS NULL
                    AND action_at IS NOT NULL
                    AND action_comment IS NULL
                )
            )
        )
        OR (
            participant_type IN ('APPROVAL', 'AGREEMENT')
            AND action_status IS NOT NULL
            AND (
                (
                    action_status = 'WAITING'
                    AND pending_at IS NULL
                    AND action_at IS NULL
                    AND action_comment IS NULL
                )
                OR (
                    action_status = 'PENDING'
                    AND pending_at IS NOT NULL
                    AND action_at IS NULL
                    AND action_comment IS NULL
                )
                OR (
                    action_status IN ('APPROVED', 'REJECTED', 'RETURNED')
                    AND action_at IS NOT NULL
                )
            )
        )
    );

ALTER TABLE public.tb_common_comment
    DROP CONSTRAINT IF EXISTS chk_tb_common_comment_event_type;

ALTER TABLE public.tb_common_comment
    ADD CONSTRAINT chk_tb_common_comment_event_type
    CHECK (
        (
            comment_type = 'USER'
            AND event_type IS NULL
        )
        OR (
            comment_type = 'SYSTEM'
            AND event_type IS NOT NULL
            AND length(btrim(event_type)) > 0
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
                'APPROVAL_CANCELED',
                'REFERENCE_CONFIRMED',
                'REFERENCE_ADDED'
            )
        )
    );

COMMIT;
