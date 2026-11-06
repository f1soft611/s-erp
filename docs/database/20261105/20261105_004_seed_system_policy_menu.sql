-- 20261105_004 시스템 정책 메뉴 등록 (환경설정 > 시스템 > 시스템 정책)
-- Set v_tenant_id to the explicitly approved target tenant before executing.
-- 권한은 기존 PLATFORM_ADMIN 역할에만 부여한다. 역할/계정은 생성하지 않는다.
-- 백엔드 메뉴 트리는 roleCode 가 PLATFORM_ADMIN 이 아니면 이 메뉴를 항상 제외한다.
BEGIN;

DO $system_policy_menu$
DECLARE
    v_tenant_id BIGINT := NULL;
    v_module_id BIGINT;
    v_parent_id BIGINT;
    v_menu_id BIGINT;
    v_sort_order INTEGER;
BEGIN
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Set v_tenant_id to the approved target tenant ID before executing.';
    END IF;

    SELECT module_id INTO STRICT v_module_id
    FROM public.tb_module
    WHERE tenant_id = v_tenant_id
      AND module_code = 'SETTINGS'
      AND use_at = 'Y';

    SELECT menu_id INTO STRICT v_parent_id
    FROM public.tb_menu
    WHERE tenant_id = v_tenant_id
      AND menu_code = 'ST_SYSTEM'
      AND module_id = v_module_id
      AND rtrim(menu_url, '/') = '/settings/system';

    IF EXISTS (
        SELECT 1 FROM public.tb_menu
        WHERE tenant_id = v_tenant_id
          AND rtrim(menu_url, '/') = '/settings/system/policies'
          AND menu_code <> 'ST_SYSTEM_POLICY'
    ) THEN
        RAISE EXCEPTION 'Another menu already uses /settings/system/policies. Review before applying.';
    END IF;

    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_sort_order
    FROM public.tb_menu
    WHERE tenant_id = v_tenant_id
      AND parent_menu_id = v_parent_id;

    INSERT INTO public.tb_menu (
        tenant_id, module_id, parent_menu_id, menu_code, menu_nm,
        menu_url, sort_order, use_at, menu_dc
    ) VALUES (
        v_tenant_id, v_module_id, v_parent_id, 'ST_SYSTEM_POLICY', '시스템 정책',
        '/settings/system/policies', v_sort_order, 'Y', '현재 테넌트의 운영 정책 값을 관리합니다.'
    ) ON CONFLICT (tenant_id, menu_code) DO NOTHING;

    SELECT menu_id INTO STRICT v_menu_id
    FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'ST_SYSTEM_POLICY';

    IF EXISTS (
        SELECT 1 FROM public.tb_menu
        WHERE menu_id = v_menu_id
          AND (rtrim(menu_url, '/') IS DISTINCT FROM '/settings/system/policies'
               OR parent_menu_id IS DISTINCT FROM v_parent_id
               OR module_id IS DISTINCT FROM v_module_id)
    ) THEN
        RAISE EXCEPTION 'Existing ST_SYSTEM_POLICY menu path, parent or module conflicts; review before applying.';
    END IF;

    INSERT INTO public.tb_menu_permission (menu_id, permission_id)
    SELECT v_menu_id, p.permission_id
    FROM public.tb_permission p
    WHERE p.permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE')
    ON CONFLICT (menu_id, permission_id) DO NOTHING;

    INSERT INTO public.tb_role_menu_permission (role_id, menu_id, permission_id)
    SELECT r.role_id, v_menu_id, p.permission_id
    FROM public.tb_role r
    CROSS JOIN public.tb_permission p
    WHERE r.tenant_id = v_tenant_id
      AND r.role_code = 'PLATFORM_ADMIN'
      AND p.permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE')
    ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;

    IF NOT EXISTS (
        SELECT 1 FROM public.tb_role r
        WHERE r.tenant_id = v_tenant_id AND r.role_code = 'PLATFORM_ADMIN'
    ) THEN
        RAISE NOTICE 'PLATFORM_ADMIN role does not exist for this tenant; menu created without role grants.';
    END IF;
END;
$system_policy_menu$;

COMMIT;