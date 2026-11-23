-- 20261123_002 롤백: 공통단가 폐지 되돌리기
-- 1) 이 작업이 추가한 기본 거래처(created_by = 'migration-20261123')를 삭제
-- 2) customer_id NOT NULL 해제, 공통단가 전용 부분 유니크 인덱스 복원
-- 3) 백업 테이블 tb_item_partner_price_common_bak_20261123 의 행을 원래 price_id 로 복원하고 백업 테이블 삭제
-- 폐지 이후 새로 등록된 단가와 충돌하는 행(같은 price_id)이 있으면 중단한다.
BEGIN;

DO $guard$
BEGIN
    IF to_regclass('public.tb_item_partner_price_common_bak_20261123') IS NULL THEN
        RAISE EXCEPTION 'Backup table tb_item_partner_price_common_bak_20261123 not found. Nothing to restore.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.tb_item_partner_price_common_bak_20261123 b
          JOIN public.tb_item_partner_price p ON p.price_id = b.price_id
    ) THEN
        RAISE EXCEPTION 'A backed up price_id already exists in tb_item_partner_price. Resolve before rollback.';
    END IF;
END;
$guard$;

DELETE FROM public.tb_item_default_supplier WHERE created_by = 'migration-20261123' AND updated_by IS NULL;

ALTER TABLE public.tb_item_partner_price ALTER COLUMN customer_id DROP NOT NULL;

COMMENT ON COLUMN public.tb_item_partner_price.customer_id
    IS '거래처 ID. NULL이면 품목 공통단가(거래처 공통)';

INSERT INTO public.tb_item_partner_price
SELECT b.* FROM public.tb_item_partner_price_common_bak_20261123 b;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tb_item_partner_price_default_key
    ON public.tb_item_partner_price (tenant_id, material_id, trade_type, start_dt)
 WHERE customer_id IS NULL;

DROP TABLE public.tb_item_partner_price_common_bak_20261123;

COMMIT;
