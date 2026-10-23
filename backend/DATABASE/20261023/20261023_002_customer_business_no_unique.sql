BEGIN;

SET LOCAL lock_timeout = '5s';
LOCK TABLE public.tb_customer_info IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.tb_customer_info
        WHERE regexp_replace(business_no, '[^0-9]', '', 'g') <> ''
        GROUP BY tenant_id, regexp_replace(business_no, '[^0-9]', '', 'g')
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Customer business numbers contain duplicates within a tenant. Resolve duplicates before applying this migration.';
    END IF;
END;
$$;

CREATE UNIQUE INDEX uq_tb_customer_info_tenant_business_no
    ON public.tb_customer_info (tenant_id, regexp_replace(business_no, '[^0-9]', '', 'g'))
    WHERE regexp_replace(business_no, '[^0-9]', '', 'g') <> '';

COMMIT;
