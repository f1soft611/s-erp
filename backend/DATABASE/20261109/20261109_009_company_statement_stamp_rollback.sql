BEGIN;
ALTER TABLE public.tb_sales_statement_hd DROP COLUMN supplier_stamp_image;
ALTER TABLE public.tb_tenant DROP COLUMN stamp_image;
COMMIT;
