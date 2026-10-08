-- Target database: s-erp_central (PostgreSQL)
-- Scope: document approval storage, common-comment event typing, and comment likes.
-- This script is a migration draft. Review and schedule it before applying to a database.

BEGIN;

CREATE TABLE public.tb_electronic_approval_main (
    electronic_approval_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    drafting_work_category_id BIGINT,
    document_type VARCHAR(40) NOT NULL,
    document_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    title VARCHAR(300) NOT NULL,
    contents_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    contents_html TEXT,
    contents_text TEXT,
    drafter_id VARCHAR(100) NOT NULL,
    drafter_name VARCHAR(150) NOT NULL,
    drafter_department_name VARCHAR(150),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    submitted_at TIMESTAMP,
    CONSTRAINT fk_electronic_approval_main_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_electronic_approval_main_drafting_category
        FOREIGN KEY (drafting_work_category_id)
        REFERENCES public.tb_drafting_work_category (drafting_work_category_id)
        ON DELETE SET NULL,
    CONSTRAINT uq_electronic_approval_main_tenant_id
        UNIQUE (tenant_id, electronic_approval_id),
    CONSTRAINT chk_electronic_approval_main_document_type
        CHECK (document_type IN (
            'DRAFTING',
            'BUSINESS_CONTACT',
            'EXPENSE_RESOLUTION',
            'ATTENDANCE_APPLICATION'
        )),
    CONSTRAINT chk_electronic_approval_main_document_status
        CHECK (document_status IN (
            'DRAFT',
            'PENDING',
            'IN_PROGRESS',
            'REVISION_REQUESTED',
            'COMPLETED'
        ))
);

CREATE INDEX idx_electronic_approval_main_tenant_status
    ON public.tb_electronic_approval_main (tenant_id, document_status, updated_at DESC);
CREATE INDEX idx_electronic_approval_main_tenant_drafter
    ON public.tb_electronic_approval_main (tenant_id, drafter_id, created_at DESC);

CREATE TABLE public.tb_electronic_approval_line_info (
    electronic_approval_line_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    electronic_approval_id BIGINT NOT NULL,
    stage_order INTEGER NOT NULL,
    participant_order INTEGER NOT NULL,
    participant_type VARCHAR(20) NOT NULL,
    participant_user_id VARCHAR(100) NOT NULL,
    participant_name VARCHAR(150) NOT NULL,
    participant_department_name VARCHAR(150),
    action_status VARCHAR(20),
    action_at TIMESTAMP,
    action_comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_electronic_approval_line_main
        FOREIGN KEY (tenant_id, electronic_approval_id)
        REFERENCES public.tb_electronic_approval_main (tenant_id, electronic_approval_id)
        ON DELETE CASCADE,
    CONSTRAINT uq_electronic_approval_line_position
        UNIQUE (tenant_id, electronic_approval_id, stage_order, participant_order),
    CONSTRAINT uq_electronic_approval_line_participant
        UNIQUE (tenant_id, electronic_approval_id, participant_user_id),
    CONSTRAINT chk_electronic_approval_line_order
        CHECK (stage_order > 0 AND participant_order > 0),
    CONSTRAINT chk_electronic_approval_line_participant_type
        CHECK (participant_type IN ('APPROVAL', 'AGREEMENT', 'REFERENCE')),
    CONSTRAINT chk_electronic_approval_line_action
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
        )
);

CREATE INDEX idx_electronic_approval_line_document_order
    ON public.tb_electronic_approval_line_info (
        tenant_id, electronic_approval_id, stage_order, participant_order
    );
CREATE INDEX idx_electronic_approval_line_pending_actor
    ON public.tb_electronic_approval_line_info (
        tenant_id, participant_user_id, action_status
    )
    WHERE action_status IN ('WAITING', 'PENDING');

ALTER TABLE public.tb_common_comment
    ADD COLUMN comment_type VARCHAR(20) NOT NULL DEFAULT 'USER',
    ADD COLUMN event_type VARCHAR(50),
    ADD CONSTRAINT uq_tb_common_comment_tenant_comment
        UNIQUE (tenant_id, comment_id),
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

CREATE TABLE public.tb_common_comment_like (
    comment_like_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    comment_id BIGINT NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_common_comment_like_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_common_comment_like_comment
        FOREIGN KEY (tenant_id, comment_id)
        REFERENCES public.tb_common_comment (tenant_id, comment_id)
        ON DELETE CASCADE,
    CONSTRAINT uq_common_comment_like_actor
        UNIQUE (tenant_id, comment_id, user_id)
);

COMMIT;
