-- 구매요청등록 메뉴 등록 롤백 (테넌트 1)
-- 역할 권한 → 메뉴 권한 → 메뉴 순으로 삭제한다.
-- 구매관리 상위 메뉴와 구매자재 모듈은 하위 메뉴가 남아 있지 않을 때만 삭제한다.
BEGIN;
DO $rollback$
DECLARE
    v_tenant_id BIGINT := 1;
BEGIN
    DELETE FROM public.tb_role_menu_permission rp
     USING public.tb_menu m
     WHERE rp.menu_id = m.menu_id AND m.tenant_id = v_tenant_id
       AND m.menu_code = 'MATERIALS_REQUEST_CREATE';
    DELETE FROM public.tb_menu_permission mp
     USING public.tb_menu m
     WHERE mp.menu_id = m.menu_id AND m.tenant_id = v_tenant_id
       AND m.menu_code = 'MATERIALS_REQUEST_CREATE';
    DELETE FROM public.tb_user_menu_favorite f
     USING public.tb_menu m
     WHERE f.menu_id = m.menu_id AND m.tenant_id = v_tenant_id
       AND m.menu_code = 'MATERIALS_REQUEST_CREATE';
    DELETE FROM public.tb_menu
     WHERE tenant_id = v_tenant_id AND menu_code = 'MATERIALS_REQUEST_CREATE';

    DELETE FROM public.tb_menu parent
     WHERE parent.tenant_id = v_tenant_id AND parent.menu_code = 'MATERIALS_PURCHASE'
       AND NOT EXISTS (SELECT 1 FROM public.tb_menu child WHERE child.parent_menu_id = parent.menu_id);

    DELETE FROM public.tb_module mo
     WHERE mo.tenant_id = v_tenant_id AND mo.module_code = 'MATERIALS'
       AND NOT EXISTS (SELECT 1 FROM public.tb_menu m WHERE m.module_id = mo.module_id);
END;
$rollback$;
COMMIT;
