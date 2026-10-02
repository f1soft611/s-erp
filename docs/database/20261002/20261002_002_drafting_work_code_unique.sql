BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.tb_drafting_work_category
        WHERE delete_status IS DISTINCT FROM 'Y'
        GROUP BY tenant_id, cata_type_code
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate active drafting work codes exist; resolve them before creating the unique index.';
    END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_drafting_work_category_tenant_cata_type
    ON public.tb_drafting_work_category (tenant_id, cata_type_code)
    WHERE delete_status IS DISTINCT FROM 'Y';

COMMIT;