-- Roll back only before plans are changed, new plans are created, or any delivery exists.
BEGIN;

DO $planning_rollback_guard$
BEGIN
    IF EXISTS (SELECT 1 FROM public.tb_sales_delivery_hd) THEN
        RAISE EXCEPTION 'Delivery history exists; planning rollback would detach delivery records.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.tb_sales_delivery_plan_hd
        WHERE plan_no NOT LIKE 'DP-MIG-%'
    ) OR EXISTS (
        SELECT 1
        FROM public.tb_sales_delivery_plan_dt
        WHERE updated_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Plans were created or changed after migration; preserve them and use a reviewed rollback.';
    END IF;
END;
$planning_rollback_guard$;

ALTER TABLE public.tb_sales_delivery_dt
    DROP CONSTRAINT fk_sales_delivery_dt_plan_source,
    DROP CONSTRAINT ck_sales_delivery_dt_source,
    DROP CONSTRAINT uq_sales_delivery_dt_plan_source,
    ADD CONSTRAINT uq_sales_delivery_dt_source
        UNIQUE (sales_delivery_id, sales_order_detail_id),
    ADD CONSTRAINT ck_sales_delivery_dt_source CHECK (
        (delivery_type = 'DIRECT' AND sales_order_id IS NULL AND sales_order_detail_id IS NULL)
        OR
        (delivery_type = 'ORDER' AND sales_order_id IS NOT NULL AND sales_order_detail_id IS NOT NULL)
    );

DROP INDEX public.ix_sales_delivery_dt_plan;
ALTER TABLE public.tb_sales_delivery_dt DROP COLUMN sales_delivery_plan_detail_id;
DROP TABLE public.tb_sales_delivery_plan_dt;
DROP TABLE public.tb_sales_delivery_plan_hd;
ALTER TABLE public.tb_tenant
    DROP CONSTRAINT ck_tenant_delivery_plan_mode,
    DROP COLUMN delivery_plan_mode;

COMMIT;
