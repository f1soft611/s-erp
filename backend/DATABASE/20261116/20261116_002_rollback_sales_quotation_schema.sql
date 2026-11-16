-- Destructive rollback: removes all quotation records.
-- Back up and review dependent application data before execution.

BEGIN;

DROP TABLE IF EXISTS public.tb_sales_quotation_dt;
DROP TABLE IF EXISTS public.tb_sales_quotation_hd;

COMMIT;
