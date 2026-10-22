BEGIN;

ALTER TABLE tb_board_post
    ADD COLUMN login_popup_yn CHAR(1) NOT NULL DEFAULT 'N',
    ADD COLUMN popup_end_date DATE,
    ADD CONSTRAINT chk_board_post_login_popup
        CHECK (login_popup_yn IN ('Y', 'N') AND (login_popup_yn = 'N' OR popup_end_date IS NOT NULL));

CREATE TABLE tb_notice_popup_dismissal (
    tenant_id BIGINT NOT NULL REFERENCES tb_tenant(tenant_id),
    post_id BIGINT NOT NULL REFERENCES tb_board_post(post_id) ON DELETE CASCADE,
    login_id BIGINT NOT NULL REFERENCES tb_login_account(login_id) ON DELETE CASCADE,
    dismissed_on DATE NOT NULL,
    PRIMARY KEY (tenant_id, post_id, login_id)
);

CREATE INDEX idx_notice_login_popup_active
    ON tb_board_post (tenant_id, popup_end_date, created_at DESC, post_id DESC)
    WHERE board_type_code = 'NOTICE' AND is_deleted = 'N' AND login_popup_yn = 'Y';

COMMIT;
