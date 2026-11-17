-- 입고 상세의 매입마감 컬럼 롤백
-- 주의: 마감된 입고 행이 있으면 마감월·마감 금액 등 마감 정보가 함께 사라진다. 실행 전 마감 데이터 존재 여부를 확인한다.
--   SELECT count(*) FROM public.tb_material_receipt_dt WHERE closing_month IS NOT NULL;
-- 입고 행과 입고 데이터 자체는 삭제하지 않는다.

BEGIN;

DROP INDEX IF EXISTS public.ix_material_receipt_dt_closing_month;

ALTER TABLE public.tb_material_receipt_dt
    DROP CONSTRAINT IF EXISTS ck_material_receipt_dt_closing_complete,
    DROP CONSTRAINT IF EXISTS ck_material_receipt_dt_closing_vat_included,
    DROP CONSTRAINT IF EXISTS ck_material_receipt_dt_closing_tax_type,
    DROP CONSTRAINT IF EXISTS ck_material_receipt_dt_closing_month;

ALTER TABLE public.tb_material_receipt_dt
    DROP COLUMN IF EXISTS closing_total_amt,
    DROP COLUMN IF EXISTS closing_vat_amt,
    DROP COLUMN IF EXISTS closing_supply_amt,
    DROP COLUMN IF EXISTS closing_vat_included_at,
    DROP COLUMN IF EXISTS closing_tax_type,
    DROP COLUMN IF EXISTS closing_unit_price,
    DROP COLUMN IF EXISTS closed_by,
    DROP COLUMN IF EXISTS closed_at,
    DROP COLUMN IF EXISTS closing_month;

COMMIT;
