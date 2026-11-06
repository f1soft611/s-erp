-- Maintenance only. Replace v_tenant_id with the same approved target as the seed.
-- Use only for plan-menu nodes introduced by this migration.
BEGIN;

DO $delivery_plan_menu_rollback$
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
          AND parent.menu_code = 'SALES_DELIVERY_PLAN'
          AND (child.tenant_id <> v_tenant_id
               OR child.menu_code NOT IN ('SALES_DELIVERY_PLAN_CREATE', 'SALES_DELIVERY_PLAN_STATUS'))
    ) THEN
        RAISE EXCEPTION 'Delivery-plan parent contains additional menu nodes. Review before rollback.';
    END IF;
    DELETE FROM public.tb_menu
    WHERE tenant_id = v_tenant_id
      AND menu_code = 'SALES_DELIVERY_PLAN_CREATE'
      AND menu_url = '/sales/delivery-plan/delivery-plan-create';
    DELETE FROM public.tb_menu
    WHERE tenant_id = v_tenant_id
      AND menu_code = 'SALES_DELIVERY_PLAN_STATUS'
      AND menu_url = '/sales/delivery-plan/delivery-plan-status';
    DELETE FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'SALES_DELIVERY_PLAN'
      AND menu_url = '/sales/delivery-plan'
      AND NOT EXISTS (
          SELECT 1 FROM public.tb_menu child WHERE child.parent_menu_id = tb_menu.menu_id
      );
END;
$delivery_plan_menu_rollback$;

COMMIT;
