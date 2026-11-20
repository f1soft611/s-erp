-- Set v_tenant_id to the same explicitly approved target tenant used by the seed.
-- The revenue group is removed only when it has no other children or references.
BEGIN;

DO $sales_revenue_closing_menu_rollback$
DECLARE
    v_tenant_id BIGINT := NULL;
    v_module_id BIGINT;
    v_revenue_id BIGINT;
    v_closing_id BIGINT;
BEGIN
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Set v_tenant_id to the explicitly approved target tenant ID before executing.';
    END IF;

    SELECT module_id INTO STRICT v_module_id
    FROM public.tb_module
    WHERE tenant_id = v_tenant_id
      AND (module_code = 'SALES' OR rtrim(module_url, '/') = '/sales')
      AND use_at = 'Y';

    SELECT menu_id INTO v_revenue_id
    FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_REVENUE';

    SELECT menu_id INTO v_closing_id
    FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_REVENUE_CLOSING';

    IF v_closing_id IS NOT NULL THEN
        IF v_revenue_id IS NULL THEN
            RAISE EXCEPTION 'Sales revenue closing menu has no expected parent group.';
        END IF;
        IF EXISTS (
            SELECT 1
            FROM public.tb_menu
            WHERE menu_id = v_closing_id
              AND (module_id <> v_module_id
                   OR menu_nm IS DISTINCT FROM '매출마감관리'
                   OR menu_url IS DISTINCT FROM '/sales/revenue/revenue-closing'
                   OR parent_menu_id IS DISTINCT FROM v_revenue_id)
        ) THEN
            RAISE EXCEPTION 'Sales revenue closing menu no longer matches the seeded path or parent.';
        END IF;

        DELETE FROM public.tb_role_menu_permission
        WHERE menu_id = v_closing_id;
        DELETE FROM public.tb_menu_permission
        WHERE menu_id = v_closing_id;
        DELETE FROM public.tb_user_menu_favorite
        WHERE menu_id = v_closing_id;
        DELETE FROM public.tb_menu
        WHERE menu_id = v_closing_id;
    END IF;

    IF v_revenue_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1
            FROM public.tb_menu
            WHERE menu_id = v_revenue_id
              AND (module_id <> v_module_id
                   OR parent_menu_id IS NOT NULL
                   OR menu_nm IS DISTINCT FROM '매출관리'
                   OR menu_url IS DISTINCT FROM '/sales/revenue'
                   OR menu_dc IS DISTINCT FROM '매출마감관리 메뉴 그룹')
        ) THEN
            RAISE EXCEPTION 'Sales revenue group no longer matches the seeded path or ownership marker.';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.tb_menu child
            WHERE child.parent_menu_id = v_revenue_id
        )
        AND NOT EXISTS (
            SELECT 1 FROM public.tb_menu_permission
            WHERE menu_id = v_revenue_id
        )
        AND NOT EXISTS (
            SELECT 1 FROM public.tb_role_menu_permission
            WHERE menu_id = v_revenue_id
        )
        AND NOT EXISTS (
            SELECT 1 FROM public.tb_user_menu_favorite
            WHERE menu_id = v_revenue_id
        ) THEN
            DELETE FROM public.tb_menu
            WHERE menu_id = v_revenue_id;
        END IF;
    END IF;
END;
$sales_revenue_closing_menu_rollback$;

COMMIT;
