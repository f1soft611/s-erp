-- Rollback for 20261030_009_add_message_thread_hidden.sql.
-- Threads hidden by participants will become visible again with their full history.

BEGIN;

ALTER TABLE public.tb_direct_message_thread
    DROP COLUMN IF EXISTS participant_b_hidden_at,
    DROP COLUMN IF EXISTS participant_a_hidden_at;

COMMIT;
