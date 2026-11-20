-- 20261120_006 롤백: 품목 기본 거래처 테이블과 단가 행 발주구분 컬럼 제거
-- 사용자가 직접 지정·수정한 기본 거래처나 입력한 발주구분이 있으면 데이터가 사라지므로 중단한다.
-- 초기 이전 데이터(created_by = 'migration', 수정 이력 없음)만 있으면 그대로 삭제한다.
BEGIN;

DO $guard$
DECLARE
    v_user_default BOOLEAN := FALSE;
    v_has_order_type BOOLEAN := FALSE;
BEGIN
    IF to_regclass('public.tb_item_default_supplier') IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.tb_item_default_supplier
            WHERE created_by IS DISTINCT FROM 'migration' OR updated_by IS NOT NULL
        ) INTO v_user_default;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tb_item_partner_price' AND column_name = 'order_type'
    ) THEN
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.tb_item_partner_price WHERE order_type IS NOT NULL)'
            INTO v_has_order_type;
    END IF;
    IF v_user_default OR v_has_order_type THEN
        RAISE EXCEPTION 'User-entered default suppliers or order types exist. Remove them before rollback.';
    END IF;
END;
$guard$;

DROP TABLE IF EXISTS public.tb_item_default_supplier;
ALTER TABLE public.tb_item_partner_price DROP COLUMN IF EXISTS order_type;

COMMIT;
