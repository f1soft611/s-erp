-- Only before business adoption. String-code references cannot be detected by FK.
-- Preserves preexisting, edited, parent-referenced and foreign-tenant rows.
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
    ('ITEM_PARTNER_TRADE_TYPE', '품목 거래처 단가 거래구분', 200, '매입', '매입', 10),
    ('ITEM_PARTNER_TRADE_TYPE', '품목 거래처 단가 거래구분', 200, '매출', '매출', 20),
    ('SALES_DELIVERY_TYPE', '출하구분', 210, 'DIRECT', '직출하', 10),
    ('SALES_DELIVERY_TYPE', '출하구분', 210, 'ORDER', '수주출하', 20),
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
END;
$$;
DELETE FROM public.tb_common_code_item i
USING public.tb_common_code_group g, page_code_context c, page_code_seed s
WHERE i.group_id = g.common_code_group_id
  AND i.tenant_id = c.tenant_id AND g.tenant_id = c.tenant_id
  AND g.group_code = s.group_code AND i.item_code = s.item_code
  AND i.item_dc = 'page-select-seed:20261116-003'
  AND i.item_nm = s.item_nm AND i.sort_order = s.item_sort AND i.use_at = 'Y'
  AND i.parent_item_id IS NULL AND i.updated_at IS NULL
  AND i.created_by IS NULL AND i.updated_by IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.tb_common_code_item child
      WHERE child.parent_item_id = i.common_code_item_id
  );
DELETE FROM public.tb_common_code_group g
USING page_code_context c,
    (SELECT DISTINCT group_code, group_nm, group_sort FROM page_code_seed) s
WHERE g.tenant_id = c.tenant_id AND g.group_code = s.group_code
  AND g.group_dc = 'page-select-seed:20261116-003'
  AND g.group_nm = s.group_nm AND g.sort_order = s.group_sort AND g.use_at = 'Y'
  AND g.parent_group_id IS NULL AND g.updated_at IS NULL
  AND g.created_by IS NULL AND g.updated_by IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.tb_common_code_item i WHERE i.group_id = g.common_code_group_id
  )
  AND NOT EXISTS (
      SELECT 1 FROM public.tb_common_code_group child
      WHERE child.parent_group_id = g.common_code_group_id
  );
COMMIT;
