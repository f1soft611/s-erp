-- 20261120_003 창고 사용여부(use_at) 컬럼 추가
-- 불용창고(disuse_at)는 불용재고를 보관·처분하는 창고이고, use_at은 창고를 더 이상 쓰지 않는 "미사용"(soft delete) 상태다.
-- 이 스크립트는 작성 시점에 실제 DB에 적용되지 않았다. 재실행해도 안전하다.
BEGIN;

ALTER TABLE public.tb_warehouse
    ADD COLUMN IF NOT EXISTS use_at CHAR(1) NOT NULL DEFAULT 'Y';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_tb_warehouse_use_at'
    ) THEN
        ALTER TABLE public.tb_warehouse
            ADD CONSTRAINT ck_tb_warehouse_use_at CHECK (use_at IN ('Y','N'));
    END IF;
END $$;

COMMENT ON COLUMN public.tb_warehouse.use_at IS '사용여부(Y=사용, N=미사용). 미사용은 삭제가 아니라 상태 변경';

COMMIT;
