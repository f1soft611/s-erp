-- Set v_tenant_id to the explicitly approved target tenant before execution.
-- Adds 기준정보 > 작업표준서 관리 > 작업표준서 등록(레시피). Existing nodes and grants are preserved on rerun.
BEGIN;
DO $work_standard_menu$
DECLARE
    v_tenant_id BIGINT := NULL;
    v_module_id BIGINT;
    v_parent_id BIGINT;
    v_recipe_id BIGINT;
BEGIN
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Set v_tenant_id to the approved target tenant ID.';
    END IF;

    SELECT module_id INTO STRICT v_module_id
    FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'CO_COMMON' AND use_at = 'Y';

    IF EXISTS (
        SELECT 1 FROM public.tb_menu
        WHERE tenant_id = v_tenant_id
          AND menu_code IN ('CO_WORK_STD', 'CO_WORK_STD_RECIPE')
          AND module_id <> v_module_id
    ) THEN
        RAISE EXCEPTION 'A work-standard menu code already belongs to a different module.';
    END IF;

    UPDATE public.tb_menu
    SET sort_order = 3, updated_at = CURRENT_TIMESTAMP
    WHERE tenant_id = v_tenant_id AND menu_code = 'CO_WORKFLOW'
      AND parent_menu_id IS NULL AND sort_order = 2;

    INSERT INTO public.tb_menu (
        tenant_id, module_id, parent_menu_id, menu_code, menu_nm,
        menu_url, sort_order, use_at, menu_dc
    ) VALUES (
        v_tenant_id, v_module_id, NULL, 'CO_WORK_STD', '작업표준서 관리',
        '/co/work-standard', 2, 'Y', '제품·반제품의 작업표준서를 관리합니다.'
    ) ON CONFLICT (tenant_id, menu_code) DO NOTHING;

    SELECT menu_id INTO STRICT v_parent_id
    FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'CO_WORK_STD';

    INSERT INTO public.tb_menu (
        tenant_id, module_id, parent_menu_id, menu_code, menu_nm,
        menu_url, sort_order, use_at, menu_dc
    ) VALUES (
        v_tenant_id, v_module_id, v_parent_id, 'CO_WORK_STD_RECIPE', '작업표준서 등록(레시피)',
        '/co/work-standard/work-standard-recipe', 10, 'Y',
        '제품·반제품의 배합비와 공정절차, 포장 기준을 버전별로 관리합니다.'
    ) ON CONFLICT (tenant_id, menu_code) DO NOTHING;

    SELECT menu_id INTO STRICT v_recipe_id
    FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'CO_WORK_STD_RECIPE';

    IF EXISTS (
        SELECT 1 FROM public.tb_menu
        WHERE tenant_id = v_tenant_id AND (
            (menu_id = v_parent_id AND (menu_url IS DISTINCT FROM '/co/work-standard'
                OR parent_menu_id IS NOT NULL OR use_at <> 'Y'))
            OR (menu_id = v_recipe_id AND (menu_url IS DISTINCT FROM '/co/work-standard/work-standard-recipe'
                OR parent_menu_id IS DISTINCT FROM v_parent_id OR use_at <> 'Y'))
        )
    ) THEN
        RAISE EXCEPTION 'Existing work-standard menu paths, parents or enabled flags conflict; review before applying.';
    END IF;

    INSERT INTO public.tb_menu_permission (menu_id, permission_id)
    SELECT v_recipe_id, permission_id FROM public.tb_permission
    WHERE permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE') AND use_at = 'Y'
    ON CONFLICT (menu_id, permission_id) DO NOTHING;

    INSERT INTO public.tb_role_menu_permission (role_id, menu_id, permission_id)
    SELECT DISTINCT rp.role_id, v_recipe_id, rp.permission_id
    FROM public.tb_role_menu_permission rp
    JOIN public.tb_menu source ON source.menu_id = rp.menu_id AND source.tenant_id = v_tenant_id
    JOIN public.tb_role r ON r.role_id = rp.role_id AND r.tenant_id = v_tenant_id
    JOIN public.tb_permission p ON p.permission_id = rp.permission_id AND p.use_at = 'Y'
    WHERE source.menu_code = 'CO_MATERIAL' AND source.use_at = 'Y'
      AND p.permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE')
    ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;
END;
$work_standard_menu$;
COMMIT;
