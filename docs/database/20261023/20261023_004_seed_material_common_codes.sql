BEGIN;

INSERT INTO public.tb_common_code_group (
    tenant_id, group_code, group_nm, group_dc, sort_order, use_at
)
SELECT
    :'target_tenant_id'::bigint, seed.group_code, seed.group_nm,
    seed.group_dc, seed.sort_order, 'Y'
FROM (
    VALUES
        ('MATERIAL_TYPE', '품목 유형', NULL::varchar, 40),
        ('STORE_METHOD', '보관 방법', NULL::varchar, 50),
        ('EXPIRY_STATUS', '소비기한 기준', '소비기한 계산 단위', 80)
) AS seed(group_code, group_nm, group_dc, sort_order)
ON CONFLICT (tenant_id, group_code) DO NOTHING;

INSERT INTO public.tb_common_code_item (
    tenant_id, group_id, item_code, item_nm, item_dc, sort_order, use_at
)
SELECT
    g.tenant_id, g.common_code_group_id, seed.item_code,
    seed.item_nm, seed.item_dc, seed.sort_order, 'Y'
FROM (
    VALUES
        ('MATERIAL_TYPE', 'TYPE_01', '초콜릿', NULL::varchar, 10),
        ('MATERIAL_TYPE', 'TYPE_02', '준초콜릿', NULL::varchar, 20),
        ('MATERIAL_TYPE', 'TYPE_03', '초콜릿가공품', NULL::varchar, 30),
        ('STORE_METHOD', 'ROOM', '실온', '1~35℃', 10),
        ('STORE_METHOD', 'AMBIENT', '상온', '15~25℃', 20),
        ('STORE_METHOD', 'REFRIG', '냉장', '0~10℃', 30),
        ('STORE_METHOD', 'FROZEN', '냉동', '-18℃ 이하', 40),
        ('STORE_METHOD', 'ROOM_OPEN_REFRIG', '실온(개봉후냉장보관)', NULL::varchar, 50),
        ('EXPIRY_STATUS', 'NONE', '없음', '소비기한 미관리', 10),
        ('EXPIRY_STATUS', 'DAY', '일', '제조일 + N일', 20),
        ('EXPIRY_STATUS', 'MONTH', '개월', '제조일 + N개월', 30),
        ('EXPIRY_STATUS', 'YEAR', '년', '제조일 + N년', 40)
) AS seed(group_code, item_code, item_nm, item_dc, sort_order)
JOIN public.tb_common_code_group g
  ON g.tenant_id = :'target_tenant_id'::bigint
 AND g.group_code = seed.group_code
ON CONFLICT (group_id, item_code) DO NOTHING;

COMMIT;
