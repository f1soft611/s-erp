-- 20261014_001 전자결재 사용자별 조회수 및 조회 이력 롤백
BEGIN;

DROP TABLE IF EXISTS public.tb_electronic_approval_view_history;

ALTER TABLE public.tb_electronic_approval_main
    DROP CONSTRAINT IF EXISTS chk_electronic_approval_main_view_count;

ALTER TABLE public.tb_electronic_approval_main
    DROP COLUMN IF EXISTS view_count;

COMMIT;
