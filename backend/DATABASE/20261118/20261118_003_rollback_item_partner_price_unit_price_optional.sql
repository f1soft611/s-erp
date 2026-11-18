-- 20261118_003 롤백. 원화단가가 NULL인 행(외화단가만 있는 행)은 먼저 정리해야 한다. 이 스크립트는 삭제하지 않고 중단한다.
BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.tb_item_partner_price WHERE unit_price IS NULL) THEN
        RAISE EXCEPTION 'unit_price가 NULL인 행이 있어 롤백할 수 없습니다. 원화단가를 채우거나 행을 정리한 뒤 다시 실행하세요.';
    END IF;
END $$;

ALTER TABLE public.tb_item_partner_price
    DROP CONSTRAINT IF EXISTS ck_tb_item_partner_price_any_price;
ALTER TABLE public.tb_item_partner_price
    ALTER COLUMN unit_price SET NOT NULL;

COMMIT;
