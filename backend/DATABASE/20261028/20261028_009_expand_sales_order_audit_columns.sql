-- Align audit keys with tb_login_account.login_code VARCHAR(100).
-- Apply after the 20261026_008 sales order schema on new environments.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.tb_sales_order_hd
    ALTER COLUMN created_by TYPE VARCHAR(100),
    ALTER COLUMN updated_by TYPE VARCHAR(100);

COMMIT;
