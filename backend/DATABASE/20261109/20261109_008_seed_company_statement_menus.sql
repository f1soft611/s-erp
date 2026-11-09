-- Set v_tenant_id to the explicitly approved target tenant before execution.
BEGIN;
DO $menus$
DECLARE
    v_tenant_id BIGINT := NULL;
    v_company_parent BIGINT;
    v_company_module BIGINT;
    v_sales_parent BIGINT;
    v_sales_module BIGINT;
    v_company BIGINT;
    v_create BIGINT;
    v_status BIGINT;
BEGIN
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Set v_tenant_id to the approved target tenant ID.';
    END IF;
    SELECT menu_id, module_id INTO STRICT v_company_parent, v_company_module
    FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'CO_COMMON' AND use_at = 'Y';
    SELECT menu_id, module_id INTO STRICT v_sales_parent, v_sales_module
    FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_DELIVERY' AND use_at = 'Y';
    INSERT INTO public.tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, sort_order, use_at, menu_dc)
    VALUES (v_tenant_id, v_company_module, v_company_parent, 'CO_COMPANY_INFO', '회사정보 관리',
            '/co/master/company-info', 60, 'Y', '거래명세서 공급자 회사정보를 관리합니다.'),
           (v_tenant_id, v_sales_module, v_sales_parent, 'SALES_STATEMENT_CREATE', '거래명세서등록',
            '/sales/delivery/statement-create', 5, 'Y', '출하별 거래명세서를 등록하고 출력합니다.'),
           (v_tenant_id, v_sales_module, v_sales_parent, 'SALES_STATEMENT_STATUS', '거래명세서현황',
            '/sales/delivery/statement-status', 6, 'Y', '거래명세서 현황을 조회하고 출력합니다.')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;
    SELECT menu_id INTO STRICT v_company FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'CO_COMPANY_INFO';
    SELECT menu_id INTO STRICT v_create FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_STATEMENT_CREATE';
    SELECT menu_id INTO STRICT v_status FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_STATEMENT_STATUS';
    IF EXISTS (SELECT 1 FROM public.tb_menu WHERE tenant_id = v_tenant_id AND (
        (menu_id = v_company AND (module_id <> v_company_module OR parent_menu_id IS DISTINCT FROM v_company_parent OR menu_url IS DISTINCT FROM '/co/master/company-info' OR use_at <> 'Y'))
        OR (menu_id = v_create AND (module_id <> v_sales_module OR parent_menu_id IS DISTINCT FROM v_sales_parent OR menu_url IS DISTINCT FROM '/sales/delivery/statement-create' OR use_at <> 'Y'))
        OR (menu_id = v_status AND (module_id <> v_sales_module OR parent_menu_id IS DISTINCT FROM v_sales_parent OR menu_url IS DISTINCT FROM '/sales/delivery/statement-status' OR use_at <> 'Y'))
    )) THEN
        RAISE EXCEPTION 'Existing company or statement menu conflicts with the expected path or parent.';
    END IF;
    INSERT INTO public.tb_menu_permission (menu_id, permission_id)
    SELECT menu_id, p.permission_id
    FROM (VALUES (v_company, 'READ'), (v_company, 'UPDATE'),
                 (v_create, 'READ'), (v_create, 'CREATE'), (v_create, 'UPDATE'), (v_create, 'DELETE'),
                 (v_status, 'READ'), (v_status, 'EXCEL')) AS target(menu_id, permission_code)
    JOIN public.tb_permission p ON p.permission_code = target.permission_code AND p.use_at = 'Y'
    ON CONFLICT (menu_id, permission_id) DO NOTHING;
    INSERT INTO public.tb_role_menu_permission (role_id, menu_id, permission_id)
    SELECT DISTINCT rp.role_id,
           CASE source.menu_code WHEN 'CO_CUSTOMER' THEN v_company
                WHEN 'SALES_DELIVERY_CREATE' THEN v_create ELSE v_status END,
           rp.permission_id
    FROM public.tb_role_menu_permission rp
    JOIN public.tb_menu source ON source.menu_id = rp.menu_id AND source.tenant_id = v_tenant_id
    JOIN public.tb_role r ON r.role_id = rp.role_id AND r.tenant_id = v_tenant_id
    JOIN public.tb_permission p ON p.permission_id = rp.permission_id AND p.use_at = 'Y'
    WHERE source.use_at = 'Y' AND (
        (source.menu_code = 'CO_CUSTOMER' AND p.permission_code IN ('READ', 'UPDATE'))
        OR (source.menu_code = 'SALES_DELIVERY_CREATE' AND p.permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE'))
        OR (source.menu_code = 'SALES_DELIVERY_STATUS' AND p.permission_code IN ('READ', 'EXCEL'))
    ) ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;
END;
$menus$;
COMMIT;
