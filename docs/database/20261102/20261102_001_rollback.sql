-- Guarded rollback for 20261102_001_create_menu_favorites.sql.
-- Refuse destructive removal while either table contains data.

BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.tb_user_menu_favorite)
       OR EXISTS (SELECT 1 FROM public.tb_user_menu_favorite_folder) THEN
        RAISE EXCEPTION 'Menu favorite tables contain data; refusing rollback';
    END IF;
END
$$;

DROP TABLE public.tb_user_menu_favorite;
DROP TABLE public.tb_user_menu_favorite_folder;

COMMIT;
