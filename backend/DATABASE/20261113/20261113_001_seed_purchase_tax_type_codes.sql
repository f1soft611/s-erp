-- 구매자재 공통코드 등록: 부가세구분(PURCHASE_TAX_TYPE)
-- 대상 테넌트: 1
-- tb_tenant에 테넌트 1이 없으면 아무 행도 등록되지 않는다.
-- 재실행해도 ON CONFLICT DO NOTHING으로 중복 등록되지 않는다.

BEGIN;

WITH target AS (
    SELECT tenant_id FROM public.tb_tenant WHERE tenant_id = 1
)
INSERT INTO public.tb_common_code_group (
    tenant_id, group_code, group_nm, group_dc, sort_order, use_at
)
SELECT
    target.tenant_id, seed.group_code, seed.group_nm,
    seed.group_dc, seed.sort_order, 'Y'
FROM target
CROSS JOIN (
    VALUES
        ('PURCHASE_TAX_TYPE', '부가세구분', '발주 품목의 부가세 과세 구분', 120)
) AS seed(group_code, group_nm, group_dc, sort_order)
ON CONFLICT (tenant_id, group_code) DO NOTHING;

INSERT INTO public.tb_common_code_item (
    tenant_id, group_id, item_code, item_nm, item_dc, sort_order, use_at
)
SELECT
    g.tenant_id, g.common_code_group_id, seed.item_code,
    seed.item_nm, NULL, seed.sort_order, 'Y'
FROM (
    VALUES
        ('PURCHASE_TAX_TYPE', 'TAXABLE',    '과세', 10),
        ('PURCHASE_TAX_TYPE', 'ZERO_RATED', '영세', 20),
        ('PURCHASE_TAX_TYPE', 'EXEMPT',     '면세', 30)
) AS seed(group_code, item_code, item_nm, sort_order)
JOIN public.tb_common_code_group g
  ON g.tenant_id = 1
 AND g.group_code = seed.group_code
ON CONFLICT (group_id, item_code) DO NOTHING;

COMMIT;

-- 확인용 조회
-- SELECT g.group_code, i.item_code, i.item_nm, i.sort_order
--   FROM public.tb_common_code_group g
--   JOIN public.tb_common_code_item i ON i.group_id = g.common_code_group_id
--  WHERE g.tenant_id = 1
--    AND g.group_code = 'PURCHASE_TAX_TYPE'
--  ORDER BY i.sort_order;
