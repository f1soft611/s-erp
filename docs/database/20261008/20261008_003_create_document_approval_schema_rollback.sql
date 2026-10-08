-- Roll back only objects introduced by 20261008_003_create_document_approval_schema.sql.

BEGIN;

DROP TABLE public.tb_common_comment_like;

ALTER TABLE public.tb_common_comment
    DROP CONSTRAINT uq_tb_common_comment_tenant_comment,
    DROP CONSTRAINT chk_tb_common_comment_event_type,
    DROP COLUMN event_type,
    DROP COLUMN comment_type;

DROP TABLE public.tb_electronic_approval_line_info;
DROP TABLE public.tb_electronic_approval_main;

COMMIT;
