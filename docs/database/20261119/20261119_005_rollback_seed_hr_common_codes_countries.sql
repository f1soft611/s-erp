-- 20261119_005 롤백: 인사 공통코드와 국가 목록을 시드 이전 상태로 되돌린다.
-- 주의: 사원(tb_user)이 이 코드 값을 이미 쓰고 있으면 값만 남고 이름 해석이 되지 않는다. 20261119_004 롤백을 먼저 실행하는 것을 권장한다.
BEGIN;

DELETE FROM public.tb_common_code_item i
USING public.tb_common_code_group g
WHERE g.common_code_group_id = i.group_id AND g.tenant_id = 1
  AND g.group_code IN ('GENDER', 'NATIVE_TYPE', 'EMPLOYMENT_TYPE', 'BIRTH_CALENDAR', 'POSITION');
DELETE FROM public.tb_common_code_group
WHERE tenant_id = 1 AND group_code IN ('GENDER', 'NATIVE_TYPE', 'EMPLOYMENT_TYPE', 'BIRTH_CALENDAR', 'POSITION');

-- 국가: 시드로 추가한 항목을 지우고 KOR·JPN을 원래 KR(한국)·JP(일본)로 되돌린다.
DELETE FROM public.tb_common_code_item i
USING public.tb_common_code_group g
WHERE g.common_code_group_id = i.group_id AND g.tenant_id = 1 AND g.group_code = 'COUNTRY'
  AND i.item_code NOT IN ('KOR', 'JPN');
UPDATE public.tb_common_code_item i
SET item_code = 'KR', item_nm = '한국', item_dc = NULL, updated_at = now()
FROM public.tb_common_code_group g
WHERE g.common_code_group_id = i.group_id AND g.tenant_id = 1 AND g.group_code = 'COUNTRY' AND i.item_code = 'KOR';
UPDATE public.tb_common_code_item i
SET item_code = 'JP', item_nm = '일본', item_dc = NULL, updated_at = now()
FROM public.tb_common_code_group g
WHERE g.common_code_group_id = i.group_id AND g.tenant_id = 1 AND g.group_code = 'COUNTRY' AND i.item_code = 'JPN';

COMMIT;
