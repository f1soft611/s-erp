-- 공정 마스터를 작업장 종속 구조로 되돌린다.
-- 마스터가 여러 작업장에 연결되어 있으면 연결 수만큼 공정을 복제해 group_id를 복원한다.
-- 어떤 작업장에도 연결되지 않은 공정 마스터가 있으면 복원할 수 없으므로 중단한다.
BEGIN;

LOCK TABLE public.tb_process_group, public.tb_process IN ACCESS EXCLUSIVE MODE;

DO $rollback$
BEGIN
    IF to_regclass('public.tb_process_group_process') IS NULL THEN
        RAISE EXCEPTION 'tb_process_group_process does not exist; nothing to roll back.';
    END IF;
    LOCK TABLE public.tb_process_group_process IN ACCESS EXCLUSIVE MODE;
    IF EXISTS (SELECT 1 FROM public.tb_process p WHERE NOT EXISTS (
            SELECT 1 FROM public.tb_process_group_process m
            WHERE m.tenant_id = p.tenant_id AND m.process_id = p.process_id)) THEN
        RAISE EXCEPTION 'Unmapped process masters exist; map or remove them before rollback.';
    END IF;
END
$rollback$;

ALTER TABLE public.tb_process ADD COLUMN group_id BIGINT;

CREATE TEMP TABLE tmp_process_map ON COMMIT DROP AS
SELECT tenant_id, group_id, process_id,
       ROW_NUMBER() OVER (PARTITION BY tenant_id, process_id ORDER BY map_id) AS rn
FROM public.tb_process_group_process;

UPDATE public.tb_process p SET group_id = m.group_id
FROM tmp_process_map m
WHERE m.rn = 1 AND m.tenant_id = p.tenant_id AND m.process_id = p.process_id;

INSERT INTO public.tb_process (tenant_id, group_id, name, description, image, inactive,
    production_outsource, purchase_outsource, inspection, packing, stock_management,
    previous_stock_out, final_process, planned_equipment, actual_equipment_required)
SELECT p.tenant_id, m.group_id, p.name, p.description, p.image, p.inactive,
    p.production_outsource, p.purchase_outsource, p.inspection, p.packing, p.stock_management,
    p.previous_stock_out, p.final_process, p.planned_equipment, p.actual_equipment_required
FROM tmp_process_map m
JOIN public.tb_process p ON p.tenant_id = m.tenant_id AND p.process_id = m.process_id
WHERE m.rn > 1;

DROP TABLE public.tb_process_group_process;
ALTER TABLE public.tb_process DROP CONSTRAINT uq_process_tenant_process;
ALTER TABLE public.tb_process ALTER COLUMN group_id SET NOT NULL;
ALTER TABLE public.tb_process ADD CONSTRAINT tb_process_tenant_id_group_id_fkey
    FOREIGN KEY (tenant_id, group_id) REFERENCES public.tb_process_group (tenant_id, group_id);
CREATE INDEX idx_process_group ON public.tb_process (tenant_id, group_id);
COMMENT ON TABLE public.tb_process IS NULL;
COMMENT ON TABLE public.tb_process_group IS NULL;

COMMIT;
