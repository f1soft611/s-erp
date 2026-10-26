BEGIN;

SET LOCAL lock_timeout = '5s';
LOCK TABLE public.tb_customer_info IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.tb_customer_info
        WHERE customer_name IS NOT NULL
        GROUP BY tenant_id, btrim(customer_name)
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Customer names contain duplicates within a tenant. Resolve duplicates before applying this migration.';
    END IF;
END;
$$;

CREATE UNIQUE INDEX uq_tb_customer_info_tenant_name
    ON public.tb_customer_info (tenant_id, btrim(customer_name));

COMMIT;
