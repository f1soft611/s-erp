BEGIN;

ALTER TABLE public.tb_material_info
    DROP CONSTRAINT ck_tb_material_info_expiryed_pair;

COMMIT;
