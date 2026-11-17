-- 입고현황 메뉴 등록 롤백 (테넌트 1)
BEGIN;
DO $rollback$
DECLARE
    v_tenant_id BIGINT := 1;
BEGIN
    DELETE FROM public.tb_role_menu_permission rp
     USING public.tb_menu m
     WHERE rp.menu_id = m.menu_id AND m.tenant_id = v_tenant_id
       AND m.menu_code = 'MATERIALS_RECEIPT_STATUS';
    DELETE FROM public.tb_menu_permission mp
     USING public.tb_menu m
     WHERE mp.menu_id = m.menu_id AND m.tenant_id = v_tenant_id
       AND m.menu_code = 'MATERIALS_RECEIPT_STATUS';
    DELETE FROM public.tb_user_menu_favorite f
     USING public.tb_menu m
     WHERE f.menu_id = m.menu_id AND m.tenant_id = v_tenant_id
       AND m.menu_code = 'MATERIALS_RECEIPT_STATUS';
    DELETE FROM public.tb_menu
     WHERE tenant_id = v_tenant_id AND menu_code = 'MATERIALS_RECEIPT_STATUS';
END;
$rollback$;
COMMIT;
