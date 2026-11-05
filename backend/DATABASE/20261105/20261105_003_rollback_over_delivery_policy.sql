-- Stop writers before rollback. Never discard excess delivery history.
BEGIN;
LOCK TABLE public.tb_tenant, public.tb_sales_order_dt,
    public.tb_sales_delivery_plan_dt IN ACCESS EXCLUSIVE MODE;

DO $rollback_preflight$
BEGIN
    IF EXISTS (SELECT 1 FROM public.tb_sales_delivery_plan_dt
               WHERE delivered_qty > planned_qty)
       OR EXISTS (SELECT 1 FROM public.tb_sales_order_dt
                  WHERE shipped_qty > order_qty) THEN
        RAISE EXCEPTION 'Reconcile excess delivery quantities before rollback; no records were changed.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.tb_tenant WHERE over_delivery_policy <> 'BLOCK') THEN
        RAISE EXCEPTION 'Switch all tenants to BLOCK through approved operations before rollback.';
    END IF;
END;
$rollback_preflight$;

ALTER TABLE public.tb_sales_delivery_plan_dt
    DROP CONSTRAINT ck_sales_delivery_plan_dt_delivered,
    ADD CONSTRAINT ck_sales_delivery_plan_dt_delivered CHECK (
        delivered_qty >= 0 AND delivered_qty <> 'NaN'::numeric
        AND delivered_qty <= planned_qty
    );
ALTER TABLE public.tb_sales_order_dt
    DROP CONSTRAINT ck_sales_order_dt_shipped_nonnegative;
ALTER TABLE public.tb_tenant DROP COLUMN over_delivery_policy;
COMMENT ON COLUMN public.tb_sales_delivery_plan_dt.delivered_qty IS '누적 실납품수량';
COMMIT;
