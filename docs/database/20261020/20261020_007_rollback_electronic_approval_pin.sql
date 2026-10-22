-- Target database: s-erp_central (PostgreSQL)
-- Rollback for 20261020_007_create_electronic_approval_pin.sql.
-- This removes all personal pin records stored in the table.

BEGIN;

DROP TABLE IF EXISTS public.tb_electronic_approval_pin;

COMMIT;
