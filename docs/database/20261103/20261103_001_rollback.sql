-- Reference rollback only. Drops all push subscription/outbox/delivery data.

BEGIN;

DROP TABLE IF EXISTS public.tb_push_delivery;
DROP TABLE IF EXISTS public.tb_push_outbox;
DROP TABLE IF EXISTS public.tb_push_subscription;

COMMIT;
