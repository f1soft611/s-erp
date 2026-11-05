-- Maintenance only. Replace v_tenant_id with the same approved target as the seed.
-- This removes delivery nodes and all their grants, including post-seed grants.
-- Use only for nodes introduced by this migration; pre-existing nodes require a backup.
BEGIN;

DO $delivery_menu_rollback$
DECLARE
    v_tenant_id BIGINT := NULL;
BEGIN
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Set v_tenant_id to the approved target tenant ID before executing.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.tb_menu child
        JOIN public.tb_menu parent ON parent.menu_id = child.parent_menu_id
        WHERE parent.tenant_id = v_tenant_id
          AND parent.menu_code IN ('SALES_DELIVERY', 'SALES_DELIVERY_CREATE', 'SALES_DELIVERY_STATUS')
          AND (parent.menu_code <> 'SALES_DELIVERY'
               OR child.tenant_id <> v_tenant_id
               OR child.menu_code NOT IN ('SALES_DELIVERY_CREATE', 'SALES_DELIVERY_STATUS'))
    ) THEN
        RAISE EXCEPTION 'Delivery parent contains additional menu nodes. Review before rollback.';
    END IF;
    DELETE FROM public.tb_menu
    WHERE tenant_id = v_tenant_id
      AND menu_code IN ('SALES_DELIVERY_CREATE', 'SALES_DELIVERY_STATUS')
      AND menu_url IN ('/sales/delivery/delivery-create', '/sales/delivery/delivery-status');
    DELETE FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_DELIVERY'
      AND menu_url = '/sales/delivery'
      AND NOT EXISTS (
          SELECT 1 FROM public.tb_menu child WHERE child.parent_menu_id = tb_menu.menu_id
      );
END;
$delivery_menu_rollback$;

COMMIT;
