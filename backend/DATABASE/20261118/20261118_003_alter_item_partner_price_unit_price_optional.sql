-- 20261118_003 단가: 원화단가 필수 해제(원화단가 또는 외화단가 중 하나 이상)
-- 대상: public.tb_item_partner_price
BEGIN;

ALTER TABLE public.tb_item_partner_price
    ALTER COLUMN unit_price DROP NOT NULL;

-- 기존 CHECK (unit_price >= 0)는 NULL을 통과시키므로 그대로 둔다.
ALTER TABLE public.tb_item_partner_price
    ADD CONSTRAINT ck_tb_item_partner_price_any_price
        CHECK (unit_price IS NOT NULL OR foreign_unit_price IS NOT NULL);

COMMENT ON COLUMN public.tb_item_partner_price.unit_price IS '원화단가. 외화단가만 관리하면 NULL(원화·외화 중 하나 이상 필수)';

COMMIT;
