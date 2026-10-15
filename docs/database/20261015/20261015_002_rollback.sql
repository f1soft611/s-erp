-- 20261015_002 사용자별 전자결재 결재선 템플릿 스키마 롤백
-- Review and schedule this rollback before applying it to a database.

BEGIN;

DROP TABLE IF EXISTS public.tb_electronic_approval_line_template_info;
DROP TABLE IF EXISTS public.tb_electronic_approval_line_template;

COMMIT;
