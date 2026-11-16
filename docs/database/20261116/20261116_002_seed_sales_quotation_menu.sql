-- Set v_tenant_id to the explicitly approved target tenant before execution.
-- Adds the quotation menu beneath the tenant's active SALES module.
BEGIN;

DO $quotation_menu$
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
          AND menu_code IN ('SALES_QUOTATION', 'SALES_QUOTATION_CREATE', 'SALES_QUOTATION_STATUS')
          AND module_id <> v_module_id
    ) THEN
        RAISE EXCEPTION 'A quotation menu code already belongs to a different module.';
    END IF;

    INSERT INTO public.tb_menu (
        tenant_id, module_id, parent_menu_id, menu_code, menu_nm,
        menu_url, sort_order, use_at, menu_dc
    ) VALUES (
        v_tenant_id, v_module_id, NULL, 'SALES_QUOTATION', '견적관리',
        '/sales/quotation', 1, 'Y', '견적서 작성과 현황을 관리합니다.'
    ) ON CONFLICT (tenant_id, menu_code) DO NOTHING;

    SELECT menu_id INTO STRICT v_parent_id
    FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_QUOTATION';

    INSERT INTO public.tb_menu (
        tenant_id, module_id, parent_menu_id, menu_code, menu_nm,
        menu_url, sort_order, use_at, menu_dc
    ) VALUES
        (v_tenant_id, v_module_id, v_parent_id, 'SALES_QUOTATION_CREATE', '견적서작성',
         '/sales/quotation/quotation-create', 1, 'Y', '거래처와 품목을 입력해 견적서를 작성합니다.'),
        (v_tenant_id, v_module_id, v_parent_id, 'SALES_QUOTATION_STATUS', '견적현황',
         '/sales/quotation/quotation-status', 2, 'Y', '견적작성일 기준으로 견적과 품목 내역을 조회합니다.')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;

    SELECT menu_id INTO STRICT v_create_id
    FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_QUOTATION_CREATE';
    SELECT menu_id INTO STRICT v_status_id
    FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_QUOTATION_STATUS';

    IF EXISTS (
        SELECT 1 FROM public.tb_menu
        WHERE tenant_id = v_tenant_id AND (
            (menu_id = v_parent_id AND
                (module_id <> v_module_id OR parent_menu_id IS NOT NULL
                 OR menu_nm IS DISTINCT FROM '견적관리'
                 OR menu_url IS DISTINCT FROM '/sales/quotation' OR use_at <> 'Y'))
            OR (menu_id = v_create_id AND
                (module_id <> v_module_id OR parent_menu_id IS DISTINCT FROM v_parent_id
                 OR menu_nm IS DISTINCT FROM '견적서작성'
                 OR menu_url IS DISTINCT FROM '/sales/quotation/quotation-create' OR use_at <> 'Y'))
            OR (menu_id = v_status_id AND
                (module_id <> v_module_id OR parent_menu_id IS DISTINCT FROM v_parent_id
                 OR menu_nm IS DISTINCT FROM '견적현황'
                 OR menu_url IS DISTINCT FROM '/sales/quotation/quotation-status' OR use_at <> 'Y'))
        )
    ) THEN
        RAISE EXCEPTION 'Existing quotation menu path, parent, label, module or enabled flag conflicts.';
    END IF;

    IF EXISTS (
        SELECT required.permission_code
        FROM (VALUES ('READ'), ('CREATE'), ('UPDATE'), ('DELETE'), ('EXCEL'))
             AS required(permission_code)
        LEFT JOIN public.tb_permission p
          ON p.permission_code = required.permission_code AND p.use_at = 'Y'
        WHERE p.permission_id IS NULL
    ) THEN
        RAISE EXCEPTION 'One or more required active menu permissions are missing.';
    END IF;

    INSERT INTO public.tb_menu_permission (menu_id, permission_id)
    SELECT v_create_id, permission_id
    FROM public.tb_permission
    WHERE permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE') AND use_at = 'Y'
    UNION ALL
    SELECT v_status_id, permission_id
    FROM public.tb_permission
    WHERE permission_code IN ('READ', 'EXCEL') AND use_at = 'Y'
    ON CONFLICT (menu_id, permission_id) DO NOTHING;

    INSERT INTO public.tb_role_menu_permission (role_id, menu_id, permission_id)
    SELECT DISTINCT rp.role_id,
        CASE WHEN rtrim(m.menu_url, '/') = '/sales/order/create'
             THEN v_create_id ELSE v_status_id END,
        rp.permission_id
    FROM public.tb_role_menu_permission rp
    JOIN public.tb_menu m
      ON m.menu_id = rp.menu_id AND m.tenant_id = v_tenant_id
    JOIN public.tb_role r
      ON r.role_id = rp.role_id AND r.tenant_id = v_tenant_id AND r.use_at = 'Y'
    JOIN public.tb_permission p
      ON p.permission_id = rp.permission_id AND p.use_at = 'Y'
    WHERE m.use_at = 'Y' AND (
        (rtrim(m.menu_url, '/') = '/sales/order/create'
            AND p.permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE'))
        OR (rtrim(m.menu_url, '/') = '/sales/order/status'
            AND p.permission_code IN ('READ', 'EXCEL'))
    )
    ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;
END;
$quotation_menu$;

COMMIT;
