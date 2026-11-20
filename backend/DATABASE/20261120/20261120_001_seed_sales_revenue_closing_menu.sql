-- Set v_tenant_id to the explicitly approved target tenant before execution.
-- Adds 매출관리 > 매출마감관리 without changing existing sales menu groups.
-- READ/EXCEL grants follow sales delivery status; CREATE follows statement creation.
BEGIN;

DO $sales_revenue_closing_menu$
DECLARE
    v_tenant_id BIGINT := NULL;
    v_module_id BIGINT;
    v_revenue_id BIGINT;
    v_closing_id BIGINT;
    v_delivery_status_id BIGINT;
    v_statement_create_id BIGINT;
BEGIN
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Set v_tenant_id to the explicitly approved target tenant ID before executing.';
    END IF;

    SELECT module_id INTO STRICT v_module_id
    FROM public.tb_module
    WHERE tenant_id = v_tenant_id
      AND (module_code = 'SALES' OR rtrim(module_url, '/') = '/sales')
      AND use_at = 'Y';

    SELECT menu_id INTO STRICT v_delivery_status_id
    FROM public.tb_menu
    WHERE tenant_id = v_tenant_id
      AND module_id = v_module_id
      AND menu_code = 'SALES_DELIVERY_STATUS'
      AND use_at = 'Y';

    SELECT menu_id INTO STRICT v_statement_create_id
    FROM public.tb_menu
    WHERE tenant_id = v_tenant_id
      AND module_id = v_module_id
      AND menu_code = 'SALES_STATEMENT_CREATE'
      AND menu_url = '/sales/delivery/statement-create'
      AND use_at = 'Y';

    IF EXISTS (
        SELECT 1
        FROM public.tb_menu
        WHERE tenant_id = v_tenant_id
          AND menu_code IN ('SALES_REVENUE', 'SALES_REVENUE_CLOSING')
          AND module_id <> v_module_id
    ) THEN
        RAISE EXCEPTION 'A sales revenue menu code already belongs to a different module.';
    END IF;

    INSERT INTO public.tb_menu (
        tenant_id, module_id, parent_menu_id, menu_code, menu_nm,
        menu_url, sort_order, use_at, menu_dc
    ) VALUES (
        v_tenant_id, v_module_id, NULL, 'SALES_REVENUE', '매출관리',
        '/sales/revenue', 3, 'Y', '매출마감관리 메뉴 그룹'
    )
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;

    SELECT menu_id INTO STRICT v_revenue_id
    FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_REVENUE';

    IF EXISTS (
        SELECT 1
        FROM public.tb_menu
        WHERE menu_id = v_revenue_id
          AND (module_id <> v_module_id
               OR parent_menu_id IS NOT NULL
               OR menu_nm IS DISTINCT FROM '매출관리'
               OR menu_url IS DISTINCT FROM '/sales/revenue'
               OR menu_dc IS DISTINCT FROM '매출마감관리 메뉴 그룹'
               OR use_at <> 'Y')
    ) THEN
        RAISE EXCEPTION 'Existing sales revenue group conflicts with the expected module, label, path or enabled state.';
    END IF;

    INSERT INTO public.tb_menu (
        tenant_id, module_id, parent_menu_id, menu_code, menu_nm,
        menu_url, sort_order, use_at, menu_dc
    ) VALUES (
        v_tenant_id, v_module_id, v_revenue_id, 'SALES_REVENUE_CLOSING',
        '매출마감관리', '/sales/revenue/revenue-closing', 1, 'Y',
        '출하일 기준 매출대상과 거래처별 마감 현황을 조회합니다.'
    )
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;

    SELECT menu_id INTO STRICT v_closing_id
    FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_REVENUE_CLOSING';

    IF EXISTS (
        SELECT 1
        FROM public.tb_menu
        WHERE menu_id = v_closing_id
          AND (module_id <> v_module_id
               OR parent_menu_id IS DISTINCT FROM v_revenue_id
               OR menu_nm IS DISTINCT FROM '매출마감관리'
               OR menu_url IS DISTINCT FROM '/sales/revenue/revenue-closing'
                OR menu_dc IS DISTINCT FROM '출하일 기준 매출대상과 거래처별 마감 현황을 조회합니다.'
               OR use_at <> 'Y')
    ) THEN
        RAISE EXCEPTION 'Existing sales revenue closing menu conflicts with the expected module, parent, label, path or enabled state.';
    END IF;

    IF EXISTS (
        SELECT required.permission_code
        FROM (VALUES ('READ'), ('CREATE'), ('EXCEL')) AS required(permission_code)
        LEFT JOIN public.tb_permission p
          ON p.permission_code = required.permission_code AND p.use_at = 'Y'
        WHERE p.permission_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Required active READ, CREATE or EXCEL menu permission is missing.';
    END IF;

    INSERT INTO public.tb_menu_permission (menu_id, permission_id)
    SELECT v_closing_id, p.permission_id
    FROM public.tb_permission p
    WHERE p.permission_code IN ('READ', 'CREATE', 'EXCEL') AND p.use_at = 'Y'
    ON CONFLICT (menu_id, permission_id) DO NOTHING;

    INSERT INTO public.tb_role_menu_permission (role_id, menu_id, permission_id)
    SELECT DISTINCT rp.role_id, v_closing_id, rp.permission_id
    FROM public.tb_role_menu_permission rp
    JOIN public.tb_role r
      ON r.role_id = rp.role_id AND r.tenant_id = v_tenant_id AND r.use_at = 'Y'
    JOIN public.tb_permission p
      ON p.permission_id = rp.permission_id
     AND p.permission_code IN ('READ', 'EXCEL')
     AND p.use_at = 'Y'
    WHERE rp.menu_id = v_delivery_status_id
    ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;

    INSERT INTO public.tb_role_menu_permission (role_id, menu_id, permission_id)
    SELECT DISTINCT rp.role_id, v_closing_id, rp.permission_id
    FROM public.tb_role_menu_permission rp
    JOIN public.tb_role r
      ON r.role_id = rp.role_id AND r.tenant_id = v_tenant_id AND r.use_at = 'Y'
    JOIN public.tb_permission p
      ON p.permission_id = rp.permission_id
     AND p.permission_code = 'CREATE'
     AND p.use_at = 'Y'
    WHERE rp.menu_id = v_statement_create_id
    ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;
END;
$sales_revenue_closing_menu$;

COMMIT;
