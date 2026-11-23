-- Set the explicitly approved target tenant before execution.
-- Role grants are intentionally assigned by an administrator.
BEGIN;
DO $seed$
DECLARE
    v_tenant_id BIGINT := NULL;
    v_module_id BIGINT;
    v_group_id BIGINT;
    v_menu_id BIGINT;
BEGIN
    IF v_tenant_id IS NULL OR v_tenant_id <= 0 THEN
        RAISE EXCEPTION 'Specify a positive tenant ID.';
    END IF;
    SELECT module_id INTO STRICT v_module_id FROM public.tb_module
    WHERE tenant_id = v_tenant_id AND module_code = 'SALES' AND use_at = 'Y';

    INSERT INTO public.tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, sort_order, use_at, menu_dc)
    VALUES (v_tenant_id, v_module_id, NULL, 'SALES_MASTER', '기준정보', '/sales/master', 0, 'Y', '영업 기준정보')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;
    SELECT menu_id INTO STRICT v_group_id FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_MASTER'
      AND module_id = v_module_id AND parent_menu_id IS NULL
      AND menu_nm = '기준정보' AND menu_url = '/sales/master' AND use_at = 'Y';

    INSERT INTO public.tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, sort_order, use_at, menu_dc)
    VALUES (v_tenant_id, v_module_id, v_group_id, 'SALES_DESTINATION', '납품처 관리',
            '/sales/master/destinations', 1, 'Y', '거래처별 납품처 관리')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;
    SELECT menu_id INTO STRICT v_menu_id FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_DESTINATION'
      AND module_id = v_module_id AND parent_menu_id = v_group_id
      AND menu_nm = '납품처 관리' AND menu_url = '/sales/master/destinations' AND use_at = 'Y';

    IF (SELECT COUNT(*) FROM public.tb_permission
        WHERE permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE') AND use_at = 'Y') <> 4 THEN
        RAISE EXCEPTION 'Required menu permissions are missing.';
    END IF;
    INSERT INTO public.tb_menu_permission (menu_id, permission_id)
    SELECT v_menu_id, permission_id FROM public.tb_permission
    WHERE permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE') AND use_at = 'Y'
    ON CONFLICT (menu_id, permission_id) DO NOTHING;
END;
$seed$;
COMMIT;
