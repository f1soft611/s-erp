BEGIN;

ALTER TABLE public.tb_electronic_approval_line_info
    DROP CONSTRAINT IF EXISTS chk_electronic_approval_line_action;

ALTER TABLE public.tb_electronic_approval_line_info
    ADD CONSTRAINT chk_electronic_approval_line_action
    CHECK (
        (
            participant_type = 'REFERENCE'
            AND action_status IS NULL
            AND pending_at IS NULL
            AND action_at IS NULL
            AND action_comment IS NULL
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
                'APPROVAL_CANCELED'
            )
        )
    );

COMMIT;
