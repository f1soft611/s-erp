-- 20261118_002 구매요청확정 상세에 부가세구분·부가세포함 저장 컬럼 추가
-- 대상: public.tb_purchase_request_dt (통화는 기존 currency_code 사용)
BEGIN;

ALTER TABLE public.tb_purchase_request_dt
    ADD COLUMN IF NOT EXISTS tax_type varchar(30),
    ADD COLUMN IF NOT EXISTS vat_included_at char(1);

ALTER TABLE public.tb_purchase_request_dt
    ADD CONSTRAINT ck_tb_purchase_request_dt_vat_included_at
        CHECK (vat_included_at IS NULL OR vat_included_at IN ('Y', 'N'));

COMMENT ON COLUMN public.tb_purchase_request_dt.tax_type IS '확정 시 설정한 부가세구분(공통코드 PURCHASE_TAX_TYPE). NULL이면 과세로 취급(기존 데이터)';
COMMENT ON COLUMN public.tb_purchase_request_dt.vat_included_at IS '확정 시 설정한 부가세 포함 여부 Y/N. NULL이면 미포함으로 취급(기존 데이터)';

COMMIT;
