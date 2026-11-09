-- Apply only after reviewing dependent documents and backing up statement data.
BEGIN;
DROP TABLE public.tb_sales_statement_dt;
DROP TABLE public.tb_sales_statement_hd;
COMMIT;
