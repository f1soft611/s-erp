-- Adds delivery-detail source links and explicit revenue-close fields.
-- Review and back up data before application. This script has not been applied.
BEGIN;

ALTER TABLE public.tb_sales_statement_dt
    ADD COLUMN IF NOT EXISTS sales_delivery_detail_id BIGINT;

ALTER TABLE public.tb_sales_delivery_dt
    ADD COLUMN IF NOT EXISTS revenue_closed_at TIMESTAMP WITHOUT TIME ZONE,
    ADD COLUMN IF NOT EXISTS revenue_closed_by VARCHAR(100);

UPDATE public.tb_sales_statement_dt sd
SET sales_delivery_detail_id = dd.sales_delivery_detail_id
FROM public.tb_sales_statement_hd sh
JOIN public.tb_sales_delivery_dt dd
  ON dd.tenant_id = sh.tenant_id
 AND dd.sales_delivery_id = sh.sales_delivery_id
JOIN public.tb_sales_statement_dt match_detail
  ON match_detail.tenant_id = sh.tenant_id
 AND match_detail.sales_statement_id = sh.sales_statement_id
 AND match_detail.line_no = dd.line_no
WHERE sd.sales_statement_detail_id = match_detail.sales_statement_detail_id
  AND sh.use_at = 'Y'
  AND sd.sales_delivery_detail_id IS NULL;

DO $sales_statement_detail_source_guard$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.tb_sales_statement_dt sd
        JOIN public.tb_sales_statement_hd sh
          ON sh.sales_statement_id = sd.sales_statement_id
         AND sh.tenant_id = sd.tenant_id
        WHERE sh.use_at = 'Y'
          AND sd.sales_delivery_detail_id IS NULL
    ) THEN
        RAISE EXCEPTION 'An active statement detail could not be linked to a delivery detail by tenant, delivery and line number.';
    END IF;

    IF EXISTS (
        SELECT sd.tenant_id, sd.sales_delivery_detail_id
        FROM public.tb_sales_statement_dt sd
        JOIN public.tb_sales_statement_hd sh
          ON sh.sales_statement_id = sd.sales_statement_id
         AND sh.tenant_id = sd.tenant_id
        WHERE sh.use_at = 'Y'
          AND sd.sales_delivery_detail_id IS NOT NULL
        GROUP BY sd.tenant_id, sd.sales_delivery_detail_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'An active delivery detail is linked to more than one statement detail.';
    END IF;
END;
$sales_statement_detail_source_guard$;

DROP INDEX IF EXISTS public.uq_sales_statement_active_delivery;

CREATE UNIQUE INDEX uq_sales_statement_source_detail
    ON public.tb_sales_statement_dt (tenant_id, sales_delivery_detail_id)
    WHERE sales_delivery_detail_id IS NOT NULL;

COMMIT;
