-- 20261105_004 시스템 정책 메뉴 롤백 (유지보수 전용)
-- Replace v_tenant_id with the same approved target as the seed.
-- PLATFORM_ADMIN 외 역할 권한, 하위 메뉴, 즐겨찾기가 있으면 중단한다.
BEGIN;

DO $system_policy_menu_rollback$
DECLARE
    v_tenant_id BIGINT := NULL;
    v_menu_id BIGINT;
BEGIN
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Set v_tenant_id to the approved target tenant ID before executing.';
    END IF;

    SELECT menu_id INTO v_menu_id
    FROM public.tb_menu
    WHERE tenant_id = v_tenant_id
      AND menu_code = 'ST_SYSTEM_POLICY'
      AND rtrim(menu_url, '/') = '/settings/system/policies';

    IF v_menu_id IS NULL THEN
        RAISE NOTICE 'ST_SYSTEM_POLICY menu not found; nothing to roll back.';
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM public.tb_menu WHERE parent_menu_id = v_menu_id) THEN
        RAISE EXCEPTION 'System policy menu has child menus. Review before rollback.';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM public.tb_role_menu_permission rp
        JOIN public.tb_role r ON r.role_id = rp.role_id
        WHERE rp.menu_id = v_menu_id
          AND (r.role_code <> 'PLATFORM_ADMIN' OR r.tenant_id <> v_tenant_id)
    ) THEN
        RAISE EXCEPTION 'System policy menu has grants for roles other than PLATFORM_ADMIN. Review before rollback.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.tb_user_menu_favorite WHERE menu_id = v_menu_id) THEN
        RAISE EXCEPTION 'System policy menu is referenced by user favorites. Review before rollback.';
    END IF;

    DELETE FROM public.tb_role_menu_permission WHERE menu_id = v_menu_id;
    DELETE FROM public.tb_menu_permission WHERE menu_id = v_menu_id;
    DELETE FROM public.tb_menu WHERE menu_id = v_menu_id AND tenant_id = v_tenant_id;
END;
$system_policy_menu_rollback$;

COMMIT;