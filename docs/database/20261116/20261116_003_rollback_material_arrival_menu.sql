-- 입고관리 그룹과 가입고등록 메뉴 등록 롤백 (테넌트 1)
-- 가입고등록 메뉴를 지우고, 그룹 아래에 다른 메뉴가 남아 있지 않을 때만 입고관리 그룹도 지운다.
BEGIN;
DO $rollback$
DECLARE
    v_tenant_id BIGINT := 1;
BEGIN
    DELETE FROM public.tb_role_menu_permission rp
     USING public.tb_menu m
     WHERE rp.menu_id = m.menu_id AND m.tenant_id = v_tenant_id
       AND m.menu_code = 'MATERIALS_ARRIVAL_CREATE';
    DELETE FROM public.tb_menu_permission mp
     USING public.tb_menu m
     WHERE mp.menu_id = m.menu_id AND m.tenant_id = v_tenant_id
       AND m.menu_code = 'MATERIALS_ARRIVAL_CREATE';
    DELETE FROM public.tb_user_menu_favorite f
     USING public.tb_menu m
     WHERE f.menu_id = m.menu_id AND m.tenant_id = v_tenant_id
       AND m.menu_code = 'MATERIALS_ARRIVAL_CREATE';
    DELETE FROM public.tb_menu
     WHERE tenant_id = v_tenant_id AND menu_code = 'MATERIALS_ARRIVAL_CREATE';

    DELETE FROM public.tb_menu g
     WHERE g.tenant_id = v_tenant_id AND g.menu_code = 'MATERIALS_RECEIPT'
       AND NOT EXISTS (SELECT 1 FROM public.tb_menu c WHERE c.parent_menu_id = g.menu_id);
END;
$rollback$;
COMMIT;
