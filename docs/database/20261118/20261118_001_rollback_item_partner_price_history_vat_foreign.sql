-- 20261118_001 롤백. 기본단가(customer_id NULL) 행과 외화단가·부가세 값은 사라진다. 실행 전 데이터를 백업한다.
BEGIN;

DROP INDEX IF EXISTS public.uq_tb_item_partner_price_default_key;
DELETE FROM public.tb_item_partner_price WHERE customer_id IS NULL;

UPDATE public.tb_item_partner_price SET currency = 'KRW' WHERE currency IS NULL;
ALTER TABLE public.tb_item_partner_price
    ALTER COLUMN currency SET DEFAULT 'KRW',
    ALTER COLUMN currency SET NOT NULL;

ALTER TABLE public.tb_item_partner_price
    DROP CONSTRAINT IF EXISTS ck_tb_item_partner_price_vat_included_at,
    DROP CONSTRAINT IF EXISTS ck_tb_item_partner_price_foreign_unit_price,
    DROP COLUMN IF EXISTS tax_type,
    DROP COLUMN IF EXISTS vat_included_at,
    DROP COLUMN IF EXISTS foreign_unit_price;

ALTER TABLE public.tb_item_partner_price
    ALTER COLUMN customer_id SET NOT NULL;

COMMIT;
