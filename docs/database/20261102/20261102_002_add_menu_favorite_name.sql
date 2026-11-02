-- Add an optional user-defined display name to menu favorites.
-- Existing rows keep NULL and display the authorized menu's canonical name.
-- Reference/provisioning draft only. Do not apply to a live database in this task.

BEGIN;

ALTER TABLE public.tb_user_menu_favorite
    ADD COLUMN IF NOT EXISTS favorite_nm VARCHAR(100);

COMMIT;
