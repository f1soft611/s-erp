-- Roll back only the newly created, empty sales-order tables.
-- Refuse to remove order data and never drop dependent objects automatically.

BEGIN;

LOCK TABLE public.tb_sales_order_dt IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.tb_sales_order_hd IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.tb_sales_order_hd LIMIT 1)
       OR EXISTS (SELECT 1 FROM public.tb_sales_order_dt LIMIT 1) THEN
        RAISE EXCEPTION 'Refusing to drop sales-order tables: order rows exist.';
    END IF;
END;
$$;

DROP TABLE public.tb_sales_order_dt;
DROP TABLE public.tb_sales_order_hd;

COMMIT;
