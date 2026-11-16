-- 구매자재 공통코드(부가세구분) 등록 롤백 (테넌트 1)
-- 주의: 발주 데이터가 이 코드를 참조하기 시작한 뒤에는 실행 전 참조 여부를 먼저 확인한다.

BEGIN;

DELETE FROM public.tb_common_code_item i
 USING public.tb_common_code_group g
 WHERE i.group_id = g.common_code_group_id
   AND g.tenant_id = 1
   AND g.group_code = 'PURCHASE_TAX_TYPE'
   AND i.item_code IN ('TAXABLE', 'ZERO_RATED', 'EXEMPT');

DELETE FROM public.tb_common_code_group g
 WHERE g.tenant_id = 1
   AND g.group_code = 'PURCHASE_TAX_TYPE'
   AND NOT EXISTS (
       SELECT 1 FROM public.tb_common_code_item i
        WHERE i.group_id = g.common_code_group_id
   );

COMMIT;
