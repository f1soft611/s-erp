-- 20261118_001 단가등록: 기본단가(거래처 NULL), 부가세구분·포함, 외화단가, 통화 선택화
-- 대상: public.tb_item_partner_price
BEGIN;

ALTER TABLE public.tb_item_partner_price
    ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE public.tb_item_partner_price
    ADD COLUMN IF NOT EXISTS tax_type varchar(30) NOT NULL DEFAULT 'TAXABLE',
    ADD COLUMN IF NOT EXISTS vat_included_at char(1) NOT NULL DEFAULT 'N',
    ADD COLUMN IF NOT EXISTS foreign_unit_price numeric(15, 2);

ALTER TABLE public.tb_item_partner_price
    ADD CONSTRAINT ck_tb_item_partner_price_vat_included_at
        CHECK (vat_included_at IN ('Y', 'N')),
    ADD CONSTRAINT ck_tb_item_partner_price_foreign_unit_price
        CHECK (foreign_unit_price IS NULL OR foreign_unit_price >= 0);

-- currency는 외화단가의 통화(선택). 기존 KRW(원화)는 통화 없음으로 정리한다.
ALTER TABLE public.tb_item_partner_price
    ALTER COLUMN currency DROP NOT NULL,
    ALTER COLUMN currency DROP DEFAULT;
-- 외화 통화 행은 기존 단가를 외화단가로 보존한다(원화 환산값은 알 수 없으므로 단가는 그대로 두고 검토가 필요하다).
UPDATE public.tb_item_partner_price SET foreign_unit_price = unit_price
 WHERE currency IS NOT NULL AND currency <> 'KRW';
UPDATE public.tb_item_partner_price SET currency = NULL WHERE currency = 'KRW';

-- customer_id가 NULL인 기본단가 행은 기존 유니크가 중복을 막지 못하므로 별도 부분 유니크를 둔다.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tb_item_partner_price_default_key
    ON public.tb_item_partner_price (tenant_id, material_id, trade_type, start_dt)
    WHERE customer_id IS NULL;

COMMENT ON COLUMN public.tb_item_partner_price.customer_id IS '거래처 ID. NULL이면 품목 기본단가(거래처 공통)';
COMMENT ON COLUMN public.tb_item_partner_price.tax_type IS '부가세구분(공통코드 PURCHASE_TAX_TYPE)';
COMMENT ON COLUMN public.tb_item_partner_price.vat_included_at IS '부가세 포함 여부 Y/N';
COMMENT ON COLUMN public.tb_item_partner_price.foreign_unit_price IS '외화단가(선택). 통화는 currency';
COMMENT ON COLUMN public.tb_item_partner_price.currency IS '외화단가의 통화(공통코드 CURRENCY). 외화단가가 없으면 NULL';

COMMIT;
