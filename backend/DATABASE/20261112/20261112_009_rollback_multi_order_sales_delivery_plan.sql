-- Restore the singular order relationship only when every plan is losslessly
-- representable by exactly one source order.
BEGIN;

LOCK TABLE public.tb_sales_delivery_plan_hd IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.tb_sales_delivery_plan_dt IN ACCESS EXCLUSIVE MODE;

DO $rollback_guard$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.tb_sales_delivery_plan_hd h
        WHERE NOT EXISTS (
            SELECT 1
            FROM public.tb_sales_delivery_plan_dt d
            WHERE d.sales_delivery_plan_id = h.sales_delivery_plan_id
              AND d.tenant_id = h.tenant_id
        )
    ) THEN
        RAISE EXCEPTION
            'Cannot restore the singular plan order: every plan header must have at least one detail';
    END IF;

    IF EXISTS (
        SELECT h.sales_delivery_plan_id
        FROM public.tb_sales_delivery_plan_hd h
        JOIN public.tb_sales_delivery_plan_dt d
          ON d.sales_delivery_plan_id = h.sales_delivery_plan_id
         AND d.tenant_id = h.tenant_id
        GROUP BY h.sales_delivery_plan_id, h.tenant_id
        HAVING COUNT(DISTINCT d.sales_order_id) <> 1
    ) THEN
        RAISE EXCEPTION
            'Cannot restore the singular plan order: each plan must reference exactly one distinct source order';
    END IF;

    IF EXISTS (
        SELECT source_order.tenant_id, source_order.sales_order_id
        FROM (
            SELECT DISTINCT h.tenant_id, h.sales_delivery_plan_id, d.sales_order_id
            FROM public.tb_sales_delivery_plan_hd h
            JOIN public.tb_sales_delivery_plan_dt d
              ON d.sales_delivery_plan_id = h.sales_delivery_plan_id
             AND d.tenant_id = h.tenant_id
        ) source_order
        GROUP BY source_order.tenant_id, source_order.sales_order_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Cannot restore uq_sales_delivery_plan_hd_order: multiple plans reference the same source order';
    END IF;
END;
$rollback_guard$;

ALTER TABLE public.tb_sales_delivery_plan_hd
    ADD COLUMN sales_order_id BIGINT;

UPDATE public.tb_sales_delivery_plan_hd h
SET sales_order_id = source_order.sales_order_id
FROM (
    SELECT DISTINCT sales_delivery_plan_id, tenant_id, sales_order_id
    FROM public.tb_sales_delivery_plan_dt
) source_order
WHERE source_order.sales_delivery_plan_id = h.sales_delivery_plan_id
  AND source_order.tenant_id = h.tenant_id;

ALTER TABLE public.tb_sales_delivery_plan_hd
    ALTER COLUMN sales_order_id SET NOT NULL,
    ADD CONSTRAINT tb_sales_delivery_plan_hd_sales_order_id_not_null
        CHECK (sales_order_id IS NOT NULL),
    ADD CONSTRAINT uq_sales_delivery_plan_hd_order
        UNIQUE (sales_order_id, tenant_id),
    ADD CONSTRAINT uq_sales_delivery_plan_hd_reference
        UNIQUE (sales_delivery_plan_id, tenant_id, sales_order_id),
    ADD CONSTRAINT fk_sales_delivery_plan_hd_order
        FOREIGN KEY (sales_order_id, tenant_id)
        REFERENCES public.tb_sales_order_hd (sales_order_id, tenant_id);

CREATE INDEX ix_sales_delivery_plan_hd_tenant_order
    ON public.tb_sales_delivery_plan_hd (tenant_id, sales_order_id);

ALTER TABLE public.tb_sales_delivery_plan_dt
    DROP CONSTRAINT fk_sales_delivery_plan_dt_hd,
    ADD CONSTRAINT fk_sales_delivery_plan_dt_hd
        FOREIGN KEY (sales_delivery_plan_id, tenant_id, sales_order_id)
        REFERENCES public.tb_sales_delivery_plan_hd (
            sales_delivery_plan_id, tenant_id, sales_order_id
        );

ALTER TABLE public.tb_sales_delivery_plan_hd
    DROP CONSTRAINT uq_sales_delivery_plan_hd_plan_tenant;

COMMENT ON COLUMN public.tb_sales_delivery_plan_hd.sales_order_id IS
    '계획 대상 수주 ID(테넌트 복합 FK)';

COMMIT;
