-- Only for a new, empty table created by 20261022_010_create_material_schema.sql.
-- Preserve the IDS counter to prevent reuse of issued material codes.

BEGIN;

LOCK TABLE public.tb_material_info IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.tb_material_info LIMIT 1) THEN
        RAISE EXCEPTION 'Refusing to drop tb_material_info: material rows exist.';
    END IF;
END;
$$;

DROP TABLE public.tb_material_info;

COMMIT;
