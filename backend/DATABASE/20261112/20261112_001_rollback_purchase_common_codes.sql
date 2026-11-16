-- 구매자재 공통코드 등록 롤백 (테넌트 1)
-- 주의: 구매요청/발주 데이터가 이 코드를 참조하기 시작한 뒤에는 실행 전 참조 여부를 먼저 확인한다.

BEGIN;

DELETE FROM public.tb_common_code_item i
 USING public.tb_common_code_group g
 WHERE i.group_id = g.common_code_group_id
   AND g.tenant_id = 1
   AND (
       (g.group_code = 'PURCHASE_ORDER_TYPE' AND i.item_code IN (
           'CS_MATERIAL', 'RAW_MATERIAL', 'OUTSOURCE_PROCESS', 'SUB_MATERIAL',
           'SUPPLIED_RAW', 'SUPPLIED_SUB', 'GOODS', 'CONSUMABLE',
           'DEVELOPMENT', 'DEV_CONSUMABLE'))
    OR (g.group_code = 'PURCHASE_USE_TYPE' AND i.item_code IN (
           'PRODUCTION', 'DEVELOPMENT', 'CS', 'SPARE', 'PART_MATERIAL',
           'PART_DELIVERY', 'DESIGN_CHANGE', 'ASSET', 'EXTRA_INSTALL',
           'WORK_MISTAKE', 'RAW_DEFECT'))
   );

DELETE FROM public.tb_common_code_group g
 WHERE g.tenant_id = 1
   AND g.group_code IN ('PURCHASE_ORDER_TYPE', 'PURCHASE_USE_TYPE')
   AND NOT EXISTS (
       SELECT 1 FROM public.tb_common_code_item i
        WHERE i.group_id = g.common_code_group_id
   );

COMMIT;
