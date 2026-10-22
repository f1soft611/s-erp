BEGIN;
DROP TABLE tb_notice_popup_dismissal;
DROP INDEX idx_notice_login_popup_active;
ALTER TABLE tb_board_post
    DROP CONSTRAINT chk_board_post_login_popup,
    DROP COLUMN popup_end_date,
    DROP COLUMN login_popup_yn;
COMMIT;
