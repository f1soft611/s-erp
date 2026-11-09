BEGIN;
ALTER TABLE public.tb_tenant ADD COLUMN stamp_image TEXT;
ALTER TABLE public.tb_sales_statement_hd ADD COLUMN supplier_stamp_image TEXT;
COMMIT;
