BEGIN;

ALTER TABLE public.tb_sales_delivery_dt
    DROP CONSTRAINT fk_sales_delivery_dt_hd_order;

COMMIT;
