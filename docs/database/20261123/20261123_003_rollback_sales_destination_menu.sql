BEGIN;
DO $rollback$
DECLARE
    v_tenant_id BIGINT := NULL;
    v_menu_id BIGINT;
BEGIN
    IF v_tenant_id IS NULL OR v_tenant_id <= 0 THEN
        RAISE EXCEPTION 'Specify a positive tenant ID.';
    END IF;
    SELECT menu_id INTO v_menu_id FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_DESTINATION'
      AND menu_url = '/sales/master/destinations';
    IF v_menu_id IS NULL THEN RETURN; END IF;
    IF EXISTS (SELECT 1 FROM public.tb_role_menu_permission WHERE menu_id = v_menu_id)
       OR EXISTS (SELECT 1 FROM public.tb_menu WHERE parent_menu_id = v_menu_id) THEN
        RAISE EXCEPTION 'Menu has role grants or child menus; review before rollback.';
    END IF;
    DELETE FROM public.tb_menu_permission WHERE menu_id = v_menu_id;
    DELETE FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_id = v_menu_id;
END;
$rollback$;
-- The group is retained because it may have existed before this seed.
COMMIT;
