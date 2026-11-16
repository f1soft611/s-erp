-- 구매자재 모듈, 구매관리 상위 메뉴, 구매요청등록 메뉴 등록 (테넌트 1)
-- 역할 권한은 수주등록(ORDER_CREATE)에 부여된 역할 권한을 복사한다.
-- 재실행해도 중복 등록되지 않는다. 이 스크립트는 실제 DB에 적용되지 않았다.
BEGIN;
DO $menus$
DECLARE
    v_tenant_id BIGINT := 1;
    v_module BIGINT;
    v_parent BIGINT;
    v_create BIGINT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.tb_tenant WHERE tenant_id = v_tenant_id) THEN
        RAISE EXCEPTION 'Tenant % does not exist.', v_tenant_id;
    END IF;

    INSERT INTO public.tb_module (tenant_id, module_code, module_nm, icon_nm, module_url, sort_order, use_at)
    VALUES (v_tenant_id, 'MATERIALS', '구매자재', 'ShoppingCart', '/materials', 3, 'Y')
    ON CONFLICT (tenant_id, module_code) DO NOTHING;
    SELECT module_id INTO STRICT v_module
    FROM public.tb_module WHERE tenant_id = v_tenant_id AND module_code = 'MATERIALS';

    INSERT INTO public.tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, sort_order, use_at, menu_dc)
    VALUES (v_tenant_id, v_module, NULL, 'MATERIALS_PURCHASE', '구매관리',
            '/materials/request', 10, 'Y', '구매요청과 확정을 관리합니다.')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;
    SELECT menu_id INTO STRICT v_parent
    FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'MATERIALS_PURCHASE';

    INSERT INTO public.tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, sort_order, use_at, menu_dc)
    VALUES (v_tenant_id, v_module, v_parent, 'MATERIALS_REQUEST_CREATE', '구매요청등록',
            '/materials/request/request-create', 10, 'Y', '필요한 품목의 구매를 요청합니다.')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;
    SELECT menu_id INTO STRICT v_create
    FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'MATERIALS_REQUEST_CREATE';

    IF EXISTS (SELECT 1 FROM public.tb_menu WHERE tenant_id = v_tenant_id AND (
        (menu_id = v_parent AND (module_id <> v_module OR parent_menu_id IS NOT NULL OR menu_url IS DISTINCT FROM '/materials/request' OR use_at <> 'Y'))
        OR (menu_id = v_create AND (module_id <> v_module OR parent_menu_id IS DISTINCT FROM v_parent OR menu_url IS DISTINCT FROM '/materials/request/request-create' OR use_at <> 'Y'))
    )) THEN
        RAISE EXCEPTION 'Existing purchase menu conflicts with the expected path or parent.';
    END IF;

    INSERT INTO public.tb_menu_permission (menu_id, permission_id)
    SELECT v_create, p.permission_id
    FROM public.tb_permission p
    WHERE p.permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE') AND p.use_at = 'Y'
    ON CONFLICT (menu_id, permission_id) DO NOTHING;

    INSERT INTO public.tb_role_menu_permission (role_id, menu_id, permission_id)
    SELECT DISTINCT rp.role_id, v_create, rp.permission_id
    FROM public.tb_role_menu_permission rp
    JOIN public.tb_menu source ON source.menu_id = rp.menu_id AND source.tenant_id = v_tenant_id
    JOIN public.tb_role r ON r.role_id = rp.role_id AND r.tenant_id = v_tenant_id
    JOIN public.tb_permission p ON p.permission_id = rp.permission_id AND p.use_at = 'Y'
    WHERE source.menu_code = 'ORDER_CREATE' AND source.use_at = 'Y'
      AND p.permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE')
    ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;
END;
$menus$;
COMMIT;
