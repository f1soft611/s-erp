-- 20261120_003 롤백: 창고 사용여부 컬럼 제거 (미사용 구분 정보는 사라진다)
BEGIN;
ALTER TABLE public.tb_warehouse DROP CONSTRAINT IF EXISTS ck_tb_warehouse_use_at;
ALTER TABLE public.tb_warehouse DROP COLUMN IF EXISTS use_at;
COMMIT;
