-- 20261015_002 사용자별 전자결재 결재선 템플릿 스키마
-- Target database: s-erp_central (PostgreSQL)
-- Review and schedule this migration before applying it to a database.

BEGIN;

CREATE TABLE public.tb_electronic_approval_line_template (
    template_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    owner_user_id VARCHAR(100) NOT NULL,
    eabus_no VARCHAR(3) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_electronic_approval_line_template_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id)
        ON DELETE CASCADE,
    CONSTRAINT uq_electronic_approval_line_template_tenant_id
        UNIQUE (tenant_id, template_id),
    CONSTRAINT uq_electronic_approval_line_template_owner_name
        UNIQUE (tenant_id, owner_user_id, eabus_no, template_name),
    CONSTRAINT chk_electronic_approval_line_template_eabus_no
        CHECK (eabus_no IN ('001', '008', '004', '031')),
    CONSTRAINT chk_electronic_approval_line_template_name
        CHECK (char_length(btrim(template_name)) BETWEEN 1 AND 100)
);

CREATE TABLE public.tb_electronic_approval_line_template_info (
    template_line_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    template_id BIGINT NOT NULL,
    stage_order INTEGER NOT NULL,
    participant_order INTEGER NOT NULL,
    participant_type VARCHAR(20) NOT NULL,
    participant_user_id VARCHAR(100) NOT NULL,
    CONSTRAINT fk_electronic_approval_line_template_info_template
        FOREIGN KEY (tenant_id, template_id)
        REFERENCES public.tb_electronic_approval_line_template (tenant_id, template_id)
        ON DELETE CASCADE,
    CONSTRAINT uq_electronic_approval_line_template_info_position
        UNIQUE (tenant_id, template_id, stage_order, participant_order),
    CONSTRAINT uq_electronic_approval_line_template_info_participant
        UNIQUE (tenant_id, template_id, participant_user_id),
    CONSTRAINT chk_electronic_approval_line_template_info_order
        CHECK (stage_order > 0 AND participant_order > 0),
    CONSTRAINT chk_electronic_approval_line_template_info_type
        CHECK (participant_type IN ('APPROVAL', 'AGREEMENT', 'REFERENCE'))
);

CREATE INDEX ix_electronic_approval_line_template_owner_code
    ON public.tb_electronic_approval_line_template (
        tenant_id, owner_user_id, eabus_no, updated_at DESC
    );
CREATE INDEX ix_electronic_approval_line_template_info_order
    ON public.tb_electronic_approval_line_template_info (
        tenant_id, template_id, stage_order, participant_order
    );

COMMIT;
