-- 20261022_009 Groupware schema baseline for a new environment.
-- Prerequisites: tenant, module/menu, login/user, common-code, common-file,
-- common-comment, and common-comment-like tables already exist.
-- Do not apply to a database where any target groupware table already exists.

BEGIN;

CREATE TABLE public.tb_board_type (
    board_type_code VARCHAR(30) PRIMARY KEY,
    board_name VARCHAR(100) NOT NULL,
    menu_id BIGINT NOT NULL,
    board_kind VARCHAR(20) NOT NULL
        CHECK (board_kind IN ('notice', 'board', 'archive')),
    read_auth_level VARCHAR(20) NOT NULL DEFAULT 'ALL',
    write_auth_level VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    file_upload_yn CHAR(1) NOT NULL DEFAULT 'N',
    use_yn CHAR(1) NOT NULL DEFAULT 'Y',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tb_board_type_menu
        FOREIGN KEY (menu_id)
        REFERENCES public.tb_menu (menu_id)
        ON DELETE RESTRICT
);

CREATE TABLE public.tb_board_post (
    post_id BIGSERIAL PRIMARY KEY,
    board_type_code VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    contents TEXT,
    writer_id VARCHAR(50) NOT NULL,
    writer_name VARCHAR(100),
    view_count INTEGER NOT NULL DEFAULT 0,
    is_pinned CHAR(1) NOT NULL DEFAULT 'N',
    is_deleted CHAR(1) NOT NULL DEFAULT 'N',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    contents_html TEXT,
    contents_json JSON,
    contents_text TEXT,
    last_modified_by VARCHAR(50),
    last_comment_count INTEGER NOT NULL DEFAULT 0,
    category_code VARCHAR(50),
    last_modified_by_name VARCHAR(150),
    tenant_id BIGINT NOT NULL,
    login_popup_yn CHAR(1) NOT NULL DEFAULT 'N',
    popup_end_date DATE,
    CONSTRAINT fk_tb_board_post_type
        FOREIGN KEY (board_type_code)
        REFERENCES public.tb_board_type (board_type_code),
    CONSTRAINT fk_board_post_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id),
    CONSTRAINT chk_board_post_login_popup
        CHECK (
            login_popup_yn IN ('Y', 'N')
            AND (login_popup_yn = 'N' OR popup_end_date IS NOT NULL)
        )
);

CREATE INDEX ix_board_post_tenant_type_newest
    ON public.tb_board_post (
        tenant_id,
        board_type_code,
        created_at DESC,
        post_id DESC
    );

CREATE INDEX idx_notice_login_popup_active
    ON public.tb_board_post (
        tenant_id,
        popup_end_date,
        created_at DESC,
        post_id DESC
    )
    WHERE board_type_code = 'NOTICE'
      AND is_deleted = 'N'
      AND login_popup_yn = 'Y';

CREATE TABLE public.tb_board_post_view_history (
    view_history_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL
        REFERENCES public.tb_tenant (tenant_id),
    post_id BIGINT NOT NULL
        REFERENCES public.tb_board_post (post_id),
    login_id BIGINT NOT NULL
        REFERENCES public.tb_login_account (login_id),
    viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_board_post_view_history_tenant_post_login
        UNIQUE (tenant_id, post_id, login_id)
);

CREATE INDEX ix_board_post_view_history_post
    ON public.tb_board_post_view_history (tenant_id, post_id);

CREATE TABLE public.tb_notice_popup_dismissal (
    tenant_id BIGINT NOT NULL
        REFERENCES public.tb_tenant (tenant_id),
    post_id BIGINT NOT NULL
        REFERENCES public.tb_board_post (post_id)
        ON DELETE CASCADE,
    login_id BIGINT NOT NULL
        REFERENCES public.tb_login_account (login_id)
        ON DELETE CASCADE,
    dismissed_on DATE NOT NULL,
    PRIMARY KEY (tenant_id, post_id, login_id)
);

CREATE TABLE public.tb_drafting_work_category_group (
    drafting_work_category_group_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    cata_code VARCHAR(3) NOT NULL,
    cata_name VARCHAR(20) NOT NULL,
    view_seq INTEGER NOT NULL DEFAULT 0,
    use_at CHAR(1) NOT NULL DEFAULT 'Y',
    delete_status VARCHAR(10) NOT NULL DEFAULT 'N',
    created_by BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_drafting_work_category_group_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_drafting_work_category_group_created_by
        FOREIGN KEY (created_by)
        REFERENCES public.tb_login_account (login_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_drafting_work_category_group_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES public.tb_login_account (login_id)
        ON DELETE SET NULL,
    CONSTRAINT uq_drafting_work_category_group_tenant_code
        UNIQUE (tenant_id, cata_code)
);

CREATE INDEX idx_drafting_work_category_group_tenant
    ON public.tb_drafting_work_category_group (tenant_id);
CREATE INDEX idx_drafting_work_category_group_use_at
    ON public.tb_drafting_work_category_group (use_at);

CREATE TABLE public.tb_drafting_work_category (
    drafting_work_category_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    drafting_work_category_group_id BIGINT,
    category_item_id BIGINT,
    cata_type_code VARCHAR(3) NOT NULL,
    code_name VARCHAR(50),
    view_seq INTEGER DEFAULT 0,
    type_cnt TEXT,
    reviewer_id BIGINT,
    approver_id BIGINT,
    user_type VARCHAR(10) DEFAULT '0',
    haccp_cp_status VARCHAR(10),
    reg_term VARCHAR(6),
    reg_term_id BIGINT,
    drafting_work_template_json JSONB,
    drafting_work_template_html TEXT,
    duty_charge_code VARCHAR(10),
    cata_code VARCHAR(3),
    use_at CHAR(1) NOT NULL DEFAULT 'Y',
    delete_status VARCHAR(10) DEFAULT 'N',
    created_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_drafting_work_category_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_drafting_work_category_group
        FOREIGN KEY (drafting_work_category_group_id)
        REFERENCES public.tb_drafting_work_category_group (drafting_work_category_group_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_drafting_work_category_item
        FOREIGN KEY (category_item_id)
        REFERENCES public.tb_common_code_item (common_code_item_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_drafting_work_category_reg_term_item
        FOREIGN KEY (reg_term_id)
        REFERENCES public.tb_common_code_item (common_code_item_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_drafting_work_category_reviewer
        FOREIGN KEY (reviewer_id)
        REFERENCES public.tb_login_account (login_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_drafting_work_category_approver
        FOREIGN KEY (approver_id)
        REFERENCES public.tb_login_account (login_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_drafting_work_category_created_by
        FOREIGN KEY (created_by)
        REFERENCES public.tb_login_account (login_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_drafting_work_category_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES public.tb_login_account (login_id)
        ON DELETE SET NULL
);

CREATE INDEX idx_drafting_work_category_tenant
    ON public.tb_drafting_work_category (tenant_id);
CREATE INDEX idx_drafting_work_category_group_id
    ON public.tb_drafting_work_category (drafting_work_category_group_id);
CREATE INDEX idx_drafting_work_category_reviewer_id
    ON public.tb_drafting_work_category (reviewer_id);
CREATE INDEX idx_drafting_work_category_approver_id
    ON public.tb_drafting_work_category (approver_id);
CREATE INDEX idx_drafting_work_category_cata_type
    ON public.tb_drafting_work_category (cata_type_code);
CREATE INDEX idx_drafting_work_category_use_at
    ON public.tb_drafting_work_category (use_at);
CREATE INDEX idx_drafting_work_category_category_item_id
    ON public.tb_drafting_work_category (category_item_id);
CREATE INDEX idx_drafting_work_category_reg_term_id
    ON public.tb_drafting_work_category (reg_term_id);

CREATE TABLE public.tb_drafting_work_category_authority (
    drafting_work_category_authority_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    drafting_work_category_id BIGINT NOT NULL,
    cata_type_code VARCHAR(3) NOT NULL,
    employee_no VARCHAR(10) NOT NULL,
    use_at CHAR(1) NOT NULL DEFAULT 'Y',
    delete_status VARCHAR(10) NOT NULL DEFAULT 'N',
    created_by BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_drafting_work_category_authority_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_drafting_work_category_authority_work_category
        FOREIGN KEY (drafting_work_category_id)
        REFERENCES public.tb_drafting_work_category (drafting_work_category_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_drafting_work_category_authority_created_by
        FOREIGN KEY (created_by)
        REFERENCES public.tb_login_account (login_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_drafting_work_category_authority_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES public.tb_login_account (login_id)
        ON DELETE SET NULL,
    CONSTRAINT uq_drafting_work_category_authority_mapping
        UNIQUE (tenant_id, drafting_work_category_id, employee_no)
);

CREATE INDEX idx_drafting_work_category_authority_tenant
    ON public.tb_drafting_work_category_authority (tenant_id);
CREATE INDEX idx_drafting_work_category_authority_work_category
    ON public.tb_drafting_work_category_authority (drafting_work_category_id);
CREATE INDEX idx_drafting_work_category_authority_employee_no
    ON public.tb_drafting_work_category_authority (employee_no);
CREATE INDEX idx_drafting_work_category_authority_use_at
    ON public.tb_drafting_work_category_authority (use_at);

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
    eabus_no VARCHAR(3) NOT NULL,
    deleted_yn VARCHAR(1) NOT NULL DEFAULT 'N',
    view_count INTEGER NOT NULL DEFAULT 0,
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
            'COMPLETED',
            'REJECTED'
        )),
    CONSTRAINT chk_electronic_approval_main_eabus_no
        CHECK (
            (document_type = 'DRAFTING' AND eabus_no = '001')
            OR (document_type = 'BUSINESS_CONTACT' AND eabus_no = '008')
            OR (document_type = 'EXPENSE_RESOLUTION' AND eabus_no = '004')
            OR (document_type = 'ATTENDANCE_APPLICATION' AND eabus_no = '031')
        ),
    CONSTRAINT chk_electronic_approval_main_deleted_yn
        CHECK (deleted_yn IN ('Y', 'N')),
    CONSTRAINT chk_electronic_approval_main_view_count
        CHECK (view_count >= 0)
);

CREATE INDEX idx_electronic_approval_main_tenant_status
    ON public.tb_electronic_approval_main (
        tenant_id,
        document_status,
        updated_at DESC
    );
CREATE INDEX idx_electronic_approval_main_tenant_drafter
    ON public.tb_electronic_approval_main (
        tenant_id,
        drafter_id,
        created_at DESC
    );

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
    pending_at TIMESTAMP,
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
        )
);

CREATE INDEX idx_electronic_approval_line_document_order
    ON public.tb_electronic_approval_line_info (
        tenant_id,
        electronic_approval_id,
        stage_order,
        participant_order
    );
CREATE INDEX idx_electronic_approval_line_pending_actor
    ON public.tb_electronic_approval_line_info (
        tenant_id,
        participant_user_id,
        action_status
    )
    WHERE action_status IN ('WAITING', 'PENDING');

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

CREATE INDEX ix_electronic_approval_line_template_owner_code
    ON public.tb_electronic_approval_line_template (
        tenant_id,
        owner_user_id,
        eabus_no,
        updated_at DESC
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

CREATE INDEX ix_electronic_approval_line_template_info_order
    ON public.tb_electronic_approval_line_template_info (
        tenant_id,
        template_id,
        stage_order,
        participant_order
    );

CREATE TABLE public.tb_electronic_approval_view_history (
    view_history_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL
        REFERENCES public.tb_tenant (tenant_id),
    electronic_approval_id BIGINT NOT NULL,
    login_id BIGINT NOT NULL
        REFERENCES public.tb_login_account (login_id),
    viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_electronic_approval_view_history_document
        FOREIGN KEY (tenant_id, electronic_approval_id)
        REFERENCES public.tb_electronic_approval_main (tenant_id, electronic_approval_id)
        ON DELETE CASCADE,
    CONSTRAINT uk_electronic_approval_view_history_tenant_document_login
        UNIQUE (tenant_id, electronic_approval_id, login_id)
);

CREATE INDEX ix_electronic_approval_view_history_document
    ON public.tb_electronic_approval_view_history (tenant_id, electronic_approval_id);

CREATE TABLE public.tb_electronic_approval_pin (
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    electronic_approval_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_electronic_approval_pin
        PRIMARY KEY (tenant_id, user_id, electronic_approval_id),
    CONSTRAINT fk_electronic_approval_pin_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_electronic_approval_pin_user
        FOREIGN KEY (user_id)
        REFERENCES public.tb_user (user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_electronic_approval_pin_document
        FOREIGN KEY (tenant_id, electronic_approval_id)
        REFERENCES public.tb_electronic_approval_main (tenant_id, electronic_approval_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_electronic_approval_pin_document
    ON public.tb_electronic_approval_pin (tenant_id, electronic_approval_id);

COMMIT;
