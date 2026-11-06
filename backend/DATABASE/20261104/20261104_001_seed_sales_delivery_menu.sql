-- Set v_tenant_id to the explicitly approved target tenant before executing.
-- Existing menu nodes and permissions are preserved on rerun.
BEGIN;

DO $delivery_menu$
DECLARE
    v_tenant_id BIGINT := NULL;
    v_module_id BIGINT;
    v_parent_id BIGINT;
    v_create_id BIGINT;
    v_status_id BIGINT;
BEGIN
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Set v_tenant_id to the approved target tenant ID before executing.';
    END IF;

    SELECT module_id INTO STRICT v_module_id
    FROM public.tb_module
    WHERE tenant_id = v_tenant_id
      AND (module_code = 'SALES' OR rtrim(module_url, '/') = '/sales')
      AND use_at = 'Y';

    IF EXISTS (
        SELECT 1 FROM public.tb_menu
        WHERE tenant_id = v_tenant_id
          AND menu_code IN ('SALES_DELIVERY', 'SALES_DELIVERY_CREATE', 'SALES_DELIVERY_STATUS')
          AND module_id <> v_module_id
    ) THEN
        RAISE EXCEPTION 'A delivery menu code already belongs to a different module.';
    END IF;

    INSERT INTO public.tb_menu (
        tenant_id, module_id, parent_menu_id, menu_code, menu_nm,
        menu_url, icon_nm, sort_order, use_at, menu_dc
    ) VALUES (
        v_tenant_id, v_module_id, NULL, 'SALES_DELIVERY', '납품관리',
        '/sales/delivery', 'LocalShipping', 2, 'Y', '수주납품과 직납품을 관리합니다.'
    ) ON CONFLICT (tenant_id, menu_code) DO NOTHING;

    SELECT menu_id INTO STRICT v_parent_id FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_DELIVERY';

    INSERT INTO public.tb_menu (
        tenant_id, module_id, parent_menu_id, menu_code, menu_nm,
        menu_url, sort_order, use_at, menu_dc
    ) VALUES
        (v_tenant_id, v_module_id, v_parent_id, 'SALES_DELIVERY_CREATE', '납품등록',
         '/sales/delivery/delivery-create', 1, 'Y', '수주 연계 또는 수주 없는 직납품을 등록합니다.'),
        (v_tenant_id, v_module_id, v_parent_id, 'SALES_DELIVERY_STATUS', '납품현황',
         '/sales/delivery/delivery-status', 2, 'Y', '납품일자별 납품 상세와 금액을 조회합니다.')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;

    SELECT menu_id INTO STRICT v_create_id FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_DELIVERY_CREATE';
    SELECT menu_id INTO STRICT v_status_id FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_DELIVERY_STATUS';

    -- Do not silently use conflicting existing paths/parents or disabled nodes.
    IF EXISTS (
        SELECT 1 FROM public.tb_menu
        WHERE tenant_id = v_tenant_id AND (
            (menu_id = v_parent_id AND (menu_url IS DISTINCT FROM '/sales/delivery' OR parent_menu_id IS NOT NULL OR use_at <> 'Y'))
            OR (menu_id = v_create_id AND (menu_url IS DISTINCT FROM '/sales/delivery/delivery-create' OR parent_menu_id IS DISTINCT FROM v_parent_id OR use_at <> 'Y'))
            OR (menu_id = v_status_id AND (menu_url IS DISTINCT FROM '/sales/delivery/delivery-status' OR parent_menu_id IS DISTINCT FROM v_parent_id OR use_at <> 'Y'))
        )
    ) THEN
        RAISE EXCEPTION 'Existing delivery menu paths, parents or enabled flags conflict; review before applying.';
    END IF;

    INSERT INTO public.tb_menu_permission (menu_id, permission_id)
    SELECT v_create_id, permission_id FROM public.tb_permission
    WHERE permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE')
    UNION ALL
    SELECT v_status_id, permission_id FROM public.tb_permission
    WHERE permission_code IN ('READ', 'EXCEL')
    ON CONFLICT (menu_id, permission_id) DO NOTHING;

    -- Copy only existing corresponding sales-order role grants, within this tenant.
    INSERT INTO public.tb_role_menu_permission (role_id, menu_id, permission_id)
    SELECT DISTINCT rp.role_id,
        CASE WHEN rtrim(m.menu_url, '/') = '/sales/order/create' THEN v_create_id ELSE v_status_id END,
        rp.permission_id
    FROM public.tb_role_menu_permission rp
    JOIN public.tb_menu m ON m.menu_id = rp.menu_id AND m.tenant_id = v_tenant_id
    JOIN public.tb_role r ON r.role_id = rp.role_id AND r.tenant_id = v_tenant_id
    JOIN public.tb_permission p ON p.permission_id = rp.permission_id
    WHERE m.use_at = 'Y' AND (
        (rtrim(m.menu_url, '/') = '/sales/order/create' AND p.permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE'))
        OR (rtrim(m.menu_url, '/') = '/sales/order/status' AND p.permission_code IN ('READ', 'EXCEL'))
    )
    ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;
END;
$delivery_menu$;

COMMIT;
