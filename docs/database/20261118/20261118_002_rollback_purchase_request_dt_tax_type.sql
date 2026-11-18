-- 20261118_002 롤백. 확정 행의 부가세구분·부가세포함 값은 사라진다.
BEGIN;

ALTER TABLE public.tb_purchase_request_dt
    DROP CONSTRAINT IF EXISTS ck_tb_purchase_request_dt_vat_included_at,
    DROP COLUMN IF EXISTS tax_type,
    DROP COLUMN IF EXISTS vat_included_at;

COMMIT;
