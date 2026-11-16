-- OPTIONAL: prototype work-standard screen has no persistence API yet.
-- psql -X -v ON_ERROR_STOP=1 -v target_tenant_id=<ID> -f <this-file>
\set ON_ERROR_STOP on
\encoding UTF8
BEGIN;
CREATE TEMP TABLE page_code_context ON COMMIT DROP AS
SELECT :'target_tenant_id'::bigint AS tenant_id;
CREATE TEMP TABLE page_code_seed (
    group_code varchar(50), group_nm varchar(200), group_sort integer,
    item_code varchar(50), item_nm varchar(200), item_sort integer
) ON COMMIT DROP;
INSERT INTO page_code_seed VALUES
    ('WORK_STANDARD_VERSION_STATUS', '작업표준서 버전 상태', 220, '양산', '양산', 10),
    ('WORK_STANDARD_VERSION_STATUS', '작업표준서 버전 상태', 220, '샘플', '샘플', 20),
    ('WORK_STANDARD_VERSION_STATUS', '작업표준서 버전 상태', 220, '폐기', '폐기', 30),
    ('WORK_STANDARD_SHELF_LIFE_BASE', '작업표준서 소비기한 기준', 230, '반제품 생산완료일', '반제품 생산완료일', 10),
    ('WORK_STANDARD_SHELF_LIFE_BASE', '작업표준서 소비기한 기준', 230, '제품 생산완료일', '제품 생산완료일', 20);
LOCK TABLE public.tb_common_code_group, public.tb_common_code_item IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.tb_tenant t JOIN page_code_context c USING (tenant_id)
    ) THEN
        RAISE EXCEPTION 'Target tenant does not exist';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.tb_common_code_group g
        JOIN page_code_context c USING (tenant_id)
        WHERE g.group_code IN (SELECT group_code FROM page_code_seed)
          AND (g.parent_group_id IS NOT NULL OR g.use_at <> 'Y')
    ) THEN
        RAISE EXCEPTION 'Existing target group must be active and have no parent';
    END IF;
END;
$$;
INSERT INTO public.tb_common_code_group (
    tenant_id, group_code, group_nm, group_dc, sort_order, use_at
)
SELECT DISTINCT c.tenant_id, s.group_code, s.group_nm,
    'page-select-seed:20261116-003', s.group_sort, 'Y'
FROM page_code_context c CROSS JOIN page_code_seed s
ON CONFLICT (tenant_id, group_code) DO NOTHING;
INSERT INTO public.tb_common_code_item (
    tenant_id, group_id, item_code, item_nm, item_dc, sort_order, use_at
)
SELECT c.tenant_id, g.common_code_group_id, s.item_code, s.item_nm,
    'page-select-seed:20261116-003', s.item_sort, 'Y'
FROM page_code_context c
JOIN public.tb_common_code_group g ON g.tenant_id = c.tenant_id
JOIN page_code_seed s ON s.group_code = g.group_code
ON CONFLICT (group_id, item_code) DO NOTHING;
COMMIT;
