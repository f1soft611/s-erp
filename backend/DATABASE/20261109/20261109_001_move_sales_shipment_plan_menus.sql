-- Set the approved target tenant before execution. No business records are changed.
BEGIN;

DO $shipment_plan_menus$
DECLARE
    v_tenant_id BIGINT := NULL;
    v_module_id BIGINT;
    v_shipment_id BIGINT;
    v_old_parent_id BIGINT;
    v_create_id BIGINT;
    v_status_id BIGINT;
    v_create_exists BOOLEAN;
    v_status_exists BOOLEAN;
BEGIN
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Set v_tenant_id to the approved target tenant ID before executing.';
    END IF;

    SELECT menu_id, module_id INTO STRICT v_shipment_id, v_module_id
    FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_DELIVERY'
      AND parent_menu_id IS NULL AND rtrim(menu_url, '/') = '/sales/delivery'
      AND use_at = 'Y';

    SELECT menu_id INTO v_old_parent_id
    FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_DELIVERY_PLAN'
      AND module_id = v_module_id AND parent_menu_id IS NULL
      AND rtrim(menu_url, '/') = '/sales/delivery-plan';

    IF EXISTS (
        SELECT 1 FROM public.tb_menu
        WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_DELIVERY_PLAN'
          AND menu_id IS DISTINCT FROM v_old_parent_id
    ) THEN
        RAISE EXCEPTION 'Conflicting standalone plan menu; review before migration.';
    END IF;

    IF v_old_parent_id IS NOT NULL AND (
        EXISTS (SELECT 1 FROM public.tb_menu
                WHERE parent_menu_id = v_old_parent_id
                  AND (tenant_id <> v_tenant_id OR menu_code NOT IN
                       ('SALES_DELIVERY_PLAN_CREATE', 'SALES_DELIVERY_PLAN_STATUS')))
        OR EXISTS (SELECT 1 FROM public.tb_role_menu_permission WHERE menu_id = v_old_parent_id)
        OR EXISTS (SELECT 1 FROM public.tb_menu_permission WHERE menu_id = v_old_parent_id)
        OR EXISTS (SELECT 1 FROM public.tb_user_menu_favorite WHERE menu_id = v_old_parent_id)
    ) THEN
        RAISE EXCEPTION 'Standalone plan menu has additional references; review before migration.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.tb_menu
        WHERE tenant_id = v_tenant_id
          AND menu_code IN ('SALES_DELIVERY_PLAN_CREATE', 'SALES_DELIVERY_PLAN_STATUS')
          AND (module_id <> v_module_id OR use_at <> 'Y'
               OR (parent_menu_id IS DISTINCT FROM v_shipment_id
                   AND (v_old_parent_id IS NULL OR parent_menu_id IS DISTINCT FROM v_old_parent_id))
               OR (menu_code = 'SALES_DELIVERY_PLAN_CREATE'
                   AND menu_url IS DISTINCT FROM '/sales/delivery-plan/delivery-plan-create')
               OR (menu_code = 'SALES_DELIVERY_PLAN_STATUS'
                   AND menu_url IS DISTINCT FROM '/sales/delivery-plan/delivery-plan-status'))
    ) THEN
        RAISE EXCEPTION 'Conflicting plan menu path, parent, module or status.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.tb_menu
        WHERE tenant_id = v_tenant_id AND (
          (menu_code = 'SALES_DELIVERY_PLAN_CREATE' AND
            ROW(menu_nm, menu_dc) IS DISTINCT FROM ROW('납품계획등록', '수주 상세별 납품예정일과 수량을 등록합니다.') AND
            ROW(menu_nm, menu_dc) IS DISTINCT FROM ROW('출하계획등록', '수주 상세별 출하예정일과 수량을 등록하거나 수정합니다.'))
          OR (menu_code = 'SALES_DELIVERY_PLAN_STATUS' AND
            ROW(menu_nm, menu_dc) IS DISTINCT FROM ROW('납품계획현황', '계획수량과 실제 납품수량을 조회합니다.') AND
            ROW(menu_nm, menu_dc) IS DISTINCT FROM ROW('출하계획현황', '계획수량과 실제 출하수량을 조회합니다.'))
        )
    ) THEN
        RAISE EXCEPTION 'Plan menu labels were customized; review before migration.';
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.tb_menu WHERE tenant_id = v_tenant_id
                   AND menu_code = 'SALES_DELIVERY_PLAN_CREATE') INTO v_create_exists;
    SELECT EXISTS (SELECT 1 FROM public.tb_menu WHERE tenant_id = v_tenant_id
                   AND menu_code = 'SALES_DELIVERY_PLAN_STATUS') INTO v_status_exists;

    INSERT INTO public.tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm,
                                menu_url, sort_order, use_at, menu_dc)
    VALUES
      (v_tenant_id, v_module_id, v_shipment_id, 'SALES_DELIVERY_PLAN_CREATE', '출하계획등록',
       '/sales/delivery-plan/delivery-plan-create', 3, 'Y', '수주 상세별 출하예정일과 수량을 등록하거나 수정합니다.'),
      (v_tenant_id, v_module_id, v_shipment_id, 'SALES_DELIVERY_PLAN_STATUS', '출하계획현황',
       '/sales/delivery-plan/delivery-plan-status', 4, 'Y', '계획수량과 실제 출하수량을 조회합니다.')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;

    SELECT menu_id INTO STRICT v_create_id FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_DELIVERY_PLAN_CREATE';
    SELECT menu_id INTO STRICT v_status_id FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_DELIVERY_PLAN_STATUS';

    UPDATE public.tb_menu SET parent_menu_id = v_shipment_id,
        menu_nm = CASE menu_code WHEN 'SALES_DELIVERY_PLAN_CREATE' THEN '출하계획등록' ELSE '출하계획현황' END,
        menu_dc = CASE menu_code WHEN 'SALES_DELIVERY_PLAN_CREATE'
            THEN '수주 상세별 출하예정일과 수량을 등록하거나 수정합니다.'
            ELSE '계획수량과 실제 출하수량을 조회합니다.' END,
        sort_order = CASE menu_code WHEN 'SALES_DELIVERY_PLAN_CREATE' THEN 3 ELSE 4 END
    WHERE tenant_id = v_tenant_id AND menu_id IN (v_create_id, v_status_id);

    INSERT INTO public.tb_menu_permission (menu_id, permission_id)
    SELECT v_create_id, permission_id FROM public.tb_permission
    WHERE permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE')
    UNION ALL
    SELECT v_status_id, permission_id FROM public.tb_permission
    WHERE permission_code IN ('READ', 'EXCEL')
    ON CONFLICT (menu_id, permission_id) DO NOTHING;

    INSERT INTO public.tb_role_menu_permission (role_id, menu_id, permission_id)
    SELECT DISTINCT rp.role_id,
        CASE WHEN rtrim(m.menu_url, '/') = '/sales/order/create' THEN v_create_id ELSE v_status_id END,
        rp.permission_id
    FROM public.tb_role_menu_permission rp
    JOIN public.tb_menu m ON m.menu_id = rp.menu_id AND m.tenant_id = v_tenant_id
    JOIN public.tb_role r ON r.role_id = rp.role_id AND r.tenant_id = v_tenant_id
    JOIN public.tb_permission p ON p.permission_id = rp.permission_id
    WHERE m.use_at = 'Y' AND (
        (NOT v_create_exists AND rtrim(m.menu_url, '/') = '/sales/order/create'
            AND p.permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE'))
        OR (NOT v_status_exists AND rtrim(m.menu_url, '/') = '/sales/order/status'
            AND p.permission_code IN ('READ', 'EXCEL'))
    )
    ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;

    DELETE FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_id = v_old_parent_id
      AND NOT EXISTS (SELECT 1 FROM public.tb_menu child WHERE child.parent_menu_id = v_old_parent_id);
END;
$shipment_plan_menus$;

COMMIT;
