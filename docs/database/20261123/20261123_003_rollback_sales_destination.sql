BEGIN;
LOCK TABLE public.tb_sales_order_hd, public.tb_sales_destination IN ACCESS EXCLUSIVE MODE;
DO $guard$
BEGIN
    IF EXISTS (SELECT 1 FROM public.tb_sales_destination)
       OR EXISTS (SELECT 1 FROM public.tb_sales_order_hd
                  WHERE sales_destination_id IS NOT NULL OR billing_customer_id IS NOT NULL) THEN
        RAISE EXCEPTION 'Destination data or order references exist; restore from backup instead.';
    END IF;
END;
$guard$;
ALTER TABLE public.tb_sales_order_hd
    DROP CONSTRAINT fk_sales_order_destination,
    DROP CONSTRAINT fk_sales_order_billing_customer,
    DROP COLUMN sales_destination_id,
    DROP COLUMN billing_customer_id;
DROP TABLE public.tb_sales_destination;
COMMIT;
