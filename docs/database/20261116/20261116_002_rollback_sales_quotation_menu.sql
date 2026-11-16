-- Set v_tenant_id to the same approved tenant used for the menu seed.
-- This rollback preserves menu, permission, and favorite rows by deactivating the three nodes.
-- Run only when the three menu codes were absent before the seed was first applied.
BEGIN;

DO $quotation_menu_rollback$
DECLARE
    v_tenant_id BIGINT := NULL;
    v_parent_id BIGINT;
    v_create_id BIGINT;
    v_status_id BIGINT;
BEGIN
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Set v_tenant_id to the approved target tenant ID before executing.';
    END IF;

    SELECT menu_id INTO v_parent_id
    FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_QUOTATION';
    SELECT menu_id INTO v_create_id
    FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_QUOTATION_CREATE';
    SELECT menu_id INTO v_status_id
    FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_QUOTATION_STATUS';

    IF v_parent_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.tb_menu
        WHERE tenant_id = v_tenant_id AND parent_menu_id = v_parent_id
          AND menu_id NOT IN (COALESCE(v_create_id, -1), COALESCE(v_status_id, -1))
    ) THEN
        RAISE EXCEPTION 'Quotation parent contains additional menu nodes. Review before rollback.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.tb_menu
        WHERE tenant_id = v_tenant_id AND (
            (menu_id = v_parent_id AND
                (parent_menu_id IS NOT NULL OR menu_url IS DISTINCT FROM '/sales/quotation'))
            OR (menu_id = v_create_id AND
                (parent_menu_id IS DISTINCT FROM v_parent_id
                 OR menu_url IS DISTINCT FROM '/sales/quotation/quotation-create'))
            OR (menu_id = v_status_id AND
                (parent_menu_id IS DISTINCT FROM v_parent_id
                 OR menu_url IS DISTINCT FROM '/sales/quotation/quotation-status'))
        )
    ) THEN
        RAISE EXCEPTION 'Quotation menu path or hierarchy changed. Review before rollback.';
    END IF;

    UPDATE public.tb_menu
    SET use_at = 'N', updated_at = CURRENT_TIMESTAMP
    WHERE tenant_id = v_tenant_id
      AND menu_id IN (COALESCE(v_parent_id, -1), COALESCE(v_create_id, -1), COALESCE(v_status_id, -1));
END;
$quotation_menu_rollback$;

COMMIT;
