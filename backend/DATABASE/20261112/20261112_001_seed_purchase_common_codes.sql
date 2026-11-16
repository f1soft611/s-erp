-- 구매자재 공통코드 등록: 발주구분(PURCHASE_ORDER_TYPE), 사용용도(PURCHASE_USE_TYPE)
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
        ('PURCHASE_ORDER_TYPE', '발주구분', '구매요청확정/발주 시 발주 성격 구분', 100),
        ('PURCHASE_USE_TYPE',   '사용용도', '구매요청 품목의 사용 목적', 110)
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
        -- 발주구분
        ('PURCHASE_ORDER_TYPE', 'CS_MATERIAL',       'C/S자재',           10),
        ('PURCHASE_ORDER_TYPE', 'RAW_MATERIAL',      '원자재',            20),
        ('PURCHASE_ORDER_TYPE', 'OUTSOURCE_PROCESS', '외주가공',          30),
        ('PURCHASE_ORDER_TYPE', 'SUB_MATERIAL',      '부자재',            40),
        ('PURCHASE_ORDER_TYPE', 'SUPPLIED_RAW',      '사급원자재',        50),
        ('PURCHASE_ORDER_TYPE', 'SUPPLIED_SUB',      '사급부자재',        60),
        ('PURCHASE_ORDER_TYPE', 'GOODS',             '상품',              70),
        ('PURCHASE_ORDER_TYPE', 'CONSUMABLE',        '소모품',            80),
        ('PURCHASE_ORDER_TYPE', 'DEVELOPMENT',       '개발용',            90),
        ('PURCHASE_ORDER_TYPE', 'DEV_CONSUMABLE',    '개발용소모품',      100),
        -- 사용용도
        ('PURCHASE_USE_TYPE',   'PRODUCTION',        '생산',              10),
        ('PURCHASE_USE_TYPE',   'DEVELOPMENT',       '개발',              20),
        ('PURCHASE_USE_TYPE',   'CS',                'C/S',               30),
        ('PURCHASE_USE_TYPE',   'SPARE',             'Spare',             40),
        ('PURCHASE_USE_TYPE',   'PART_MATERIAL',     '부품소재',          50),
        ('PURCHASE_USE_TYPE',   'PART_DELIVERY',     '부품납품',          60),
        ('PURCHASE_USE_TYPE',   'DESIGN_CHANGE',     '설계변경',          70),
        ('PURCHASE_USE_TYPE',   'ASSET',             '비품/공구/자산',    80),
        ('PURCHASE_USE_TYPE',   'EXTRA_INSTALL',     '추가설치(고객요청시)', 90),
        ('PURCHASE_USE_TYPE',   'WORK_MISTAKE',      '작업실수',          100),
        ('PURCHASE_USE_TYPE',   'RAW_DEFECT',        '원자재불량',        110)
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
--    AND g.group_code IN ('PURCHASE_ORDER_TYPE', 'PURCHASE_USE_TYPE')
--  ORDER BY g.group_code, i.sort_order;
