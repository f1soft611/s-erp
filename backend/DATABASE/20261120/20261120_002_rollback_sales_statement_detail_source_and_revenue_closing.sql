-- Roll back only when no revenue-close records or line-level/multi-delivery
-- active statement state needs to be preserved. This script has not been applied.
BEGIN;

DO $sales_statement_detail_source_rollback_guard$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.tb_sales_delivery_dt
        WHERE revenue_closed_at IS NOT NULL
           OR revenue_closed_by IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Revenue-close records exist; rollback would irreversibly discard closure state.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.tb_sales_statement_dt sd
        JOIN public.tb_sales_statement_hd sh
          ON sh.sales_statement_id = sd.sales_statement_id
         AND sh.tenant_id = sd.tenant_id
        WHERE sh.use_at = 'Y'
          AND sd.sales_delivery_detail_id IS NULL
    ) THEN
        RAISE EXCEPTION 'An active statement detail has no source delivery detail link.';
    END IF;

    IF EXISTS (
        SELECT sh.sales_statement_id
        FROM public.tb_sales_statement_hd sh
        LEFT JOIN public.tb_sales_statement_dt sd
          ON sd.sales_statement_id = sh.sales_statement_id
         AND sd.tenant_id = sh.tenant_id
        LEFT JOIN public.tb_sales_delivery_dt dd
          ON dd.sales_delivery_detail_id = sd.sales_delivery_detail_id
         AND dd.tenant_id = sd.tenant_id
        WHERE sh.use_at = 'Y'
        GROUP BY sh.sales_statement_id, sh.tenant_id, sh.sales_delivery_id
        HAVING COUNT(DISTINCT dd.sales_delivery_id) <> 1
            OR MIN(dd.sales_delivery_id) <> sh.sales_delivery_id
            OR COUNT(DISTINCT dd.sales_delivery_detail_id) <> (
                SELECT COUNT(*)
                FROM public.tb_sales_delivery_dt source_detail
                WHERE source_detail.tenant_id = sh.tenant_id
                  AND source_detail.sales_delivery_id = sh.sales_delivery_id
            )
    ) THEN
        RAISE EXCEPTION 'An active statement contains partial or multiple-delivery detail state that the prior schema cannot represent.';
    END IF;

    IF EXISTS (
        SELECT tenant_id, sales_delivery_id
        FROM public.tb_sales_statement_hd
        WHERE use_at = 'Y'
        GROUP BY tenant_id, sales_delivery_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Multiple active statements reference one delivery; the prior unique index cannot be restored.';
    END IF;
END;
$sales_statement_detail_source_rollback_guard$;

DROP INDEX IF EXISTS public.uq_sales_statement_source_detail;

ALTER TABLE public.tb_sales_statement_dt
    DROP COLUMN IF EXISTS sales_delivery_detail_id;

ALTER TABLE public.tb_sales_delivery_dt
    DROP COLUMN IF EXISTS revenue_closed_by,
    DROP COLUMN IF EXISTS revenue_closed_at;

CREATE UNIQUE INDEX uq_sales_statement_active_delivery
    ON public.tb_sales_statement_hd (tenant_id, sales_delivery_id)
    WHERE use_at = 'Y';

COMMIT;
