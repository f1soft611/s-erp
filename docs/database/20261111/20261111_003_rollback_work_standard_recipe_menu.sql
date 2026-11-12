-- Set v_tenant_id to the same approved tenant used for the seed.
-- Removes only the work-standard recipe menus when no other child menu exists.
BEGIN;
DO $work_standard_rollback$
DECLARE
    v_tenant_id BIGINT := NULL;
    v_parent_id BIGINT;
    v_recipe_id BIGINT;
BEGIN
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Set v_tenant_id to the approved target tenant ID.';
    END IF;

    SELECT menu_id INTO v_parent_id FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'CO_WORK_STD';
    SELECT menu_id INTO v_recipe_id FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'CO_WORK_STD_RECIPE';

    IF v_parent_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.tb_menu
        WHERE tenant_id = v_tenant_id AND parent_menu_id = v_parent_id
          AND menu_id IS DISTINCT FROM v_recipe_id
    ) THEN
        RAISE EXCEPTION 'Work-standard parent contains additional menu nodes. Review before rollback.';
    END IF;

    IF v_recipe_id IS NOT NULL THEN
        DELETE FROM public.tb_role_menu_permission WHERE menu_id = v_recipe_id;
        DELETE FROM public.tb_menu_permission WHERE menu_id = v_recipe_id;
        DELETE FROM public.tb_menu WHERE menu_id = v_recipe_id;
    END IF;
    IF v_parent_id IS NOT NULL THEN
        DELETE FROM public.tb_role_menu_permission WHERE menu_id = v_parent_id;
        DELETE FROM public.tb_menu_permission WHERE menu_id = v_parent_id;
        DELETE FROM public.tb_menu WHERE menu_id = v_parent_id;
    END IF;

    UPDATE public.tb_menu
    SET sort_order = 2, updated_at = CURRENT_TIMESTAMP
    WHERE tenant_id = v_tenant_id AND menu_code = 'CO_WORKFLOW'
      AND parent_menu_id IS NULL AND sort_order = 3;
END;
$work_standard_rollback$;
COMMIT;
