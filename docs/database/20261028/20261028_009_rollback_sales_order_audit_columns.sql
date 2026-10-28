-- Refuse rollback rather than truncate existing audit keys.
BEGIN;
SET LOCAL lock_timeout = '5s';

LOCK TABLE public.tb_sales_order_hd IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.tb_sales_order_hd
        WHERE char_length(created_by) > 10
           OR char_length(updated_by) > 10
    ) THEN
        RAISE EXCEPTION 'Cannot shrink sales order audit columns: values exceed 10 characters';
    END IF;
END
$$;

ALTER TABLE public.tb_sales_order_hd
    ALTER COLUMN created_by TYPE VARCHAR(10),
    ALTER COLUMN updated_by TYPE VARCHAR(10);

COMMIT;
