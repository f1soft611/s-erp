-- Refuse rollback while any user-defined favorite name would be lost.
-- Reference/provisioning draft only. Do not apply to a live database in this task.

BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.tb_user_menu_favorite
        WHERE favorite_nm IS NOT NULL
    ) THEN
        RAISE EXCEPTION
            'Cannot remove favorite_nm while custom favorite names exist.';
    END IF;
END
$$;

ALTER TABLE public.tb_user_menu_favorite
    DROP COLUMN IF EXISTS favorite_nm;

COMMIT;
