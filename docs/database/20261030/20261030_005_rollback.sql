-- Rollback for 20261030_005_create_notification_message_schema.sql
-- Review data-retention impact and take an approved backup before applying.

BEGIN;

DROP TABLE IF EXISTS public.tb_direct_message;
DROP TABLE IF EXISTS public.tb_direct_message_thread;
DROP TABLE IF EXISTS public.tb_notification;

COMMIT;
