-- 매입마감처리 메뉴 등록 롤백 (테넌트 1)
-- 화면 메뉴와 그 역할 권한·메뉴 권한·즐겨찾기만 지운다. 입고관리 그룹과 다른 화면은 건드리지 않는다.
BEGIN;
DO $rollback$
DECLARE
    v_tenant_id BIGINT := 1;
BEGIN
    DELETE FROM public.tb_role_menu_permission rp
     USING public.tb_menu m
     WHERE rp.menu_id = m.menu_id AND m.tenant_id = v_tenant_id AND m.menu_code = 'MATERIALS_RECEIPT_CLOSING';
    DELETE FROM public.tb_menu_permission mp
     USING public.tb_menu m
     WHERE mp.menu_id = m.menu_id AND m.tenant_id = v_tenant_id AND m.menu_code = 'MATERIALS_RECEIPT_CLOSING';
    DELETE FROM public.tb_user_menu_favorite f
     USING public.tb_menu m
     WHERE f.menu_id = m.menu_id AND m.tenant_id = v_tenant_id AND m.menu_code = 'MATERIALS_RECEIPT_CLOSING';
    DELETE FROM public.tb_menu
     WHERE tenant_id = v_tenant_id AND menu_code = 'MATERIALS_RECEIPT_CLOSING';
END;
$rollback$;
COMMIT;
