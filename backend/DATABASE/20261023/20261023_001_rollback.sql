BEGIN;

SET LOCAL lock_timeout = '5s';
DROP INDEX IF EXISTS public.uq_tb_customer_info_tenant_name;

COMMIT;
