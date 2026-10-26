BEGIN;

ALTER TABLE public.tb_material_info
    ADD CONSTRAINT ck_tb_material_info_expiryed_pair
    CHECK (
        (expiryed_status = 'NONE' AND expiryed_count IS NULL)
        OR
        (expiryed_status IN ('DAY', 'MONTH', 'YEAR') AND expiryed_count > 0)
    );

COMMIT;
