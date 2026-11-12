-- Remove the singular order relationship from sales delivery plan headers.
-- Apply after the existing sales delivery planning schema is present.
BEGIN;

LOCK TABLE public.tb_sales_delivery_plan_hd IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.tb_sales_delivery_plan_dt IN ACCESS EXCLUSIVE MODE;

ALTER TABLE public.tb_sales_delivery_plan_hd
    ADD CONSTRAINT uq_sales_delivery_plan_hd_plan_tenant
        UNIQUE (sales_delivery_plan_id, tenant_id);

ALTER TABLE public.tb_sales_delivery_plan_dt
    DROP CONSTRAINT fk_sales_delivery_plan_dt_hd;

ALTER TABLE public.tb_sales_delivery_plan_hd
    DROP CONSTRAINT uq_sales_delivery_plan_hd_order,
    DROP CONSTRAINT uq_sales_delivery_plan_hd_reference,
    DROP CONSTRAINT fk_sales_delivery_plan_hd_order,
    DROP CONSTRAINT tb_sales_delivery_plan_hd_sales_order_id_not_null;

DROP INDEX IF EXISTS public.ix_sales_delivery_plan_hd_tenant_order;

ALTER TABLE public.tb_sales_delivery_plan_hd
    DROP COLUMN sales_order_id;

ALTER TABLE public.tb_sales_delivery_plan_dt
    ADD CONSTRAINT fk_sales_delivery_plan_dt_hd
        FOREIGN KEY (sales_delivery_plan_id, tenant_id)
        REFERENCES public.tb_sales_delivery_plan_hd (sales_delivery_plan_id, tenant_id);

COMMIT;
