-- 20261120_004 점검용 창고 3건 정리
-- 점검 중 "삭제" 대신 불용창고로 눌러 둔 점검창고를 불용창고에서 되돌리고 미사용으로 정리한다.
-- 선행: 20261120_003 적용. 이름이 정확히 일치하는 행만 바꾸며 재실행해도 결과는 같다.
BEGIN;

UPDATE public.tb_warehouse
   SET disuse_at = 'N',
       use_at = 'N',
       updated_at = CURRENT_TIMESTAMP
 WHERE warehouse_name IN ('점검창고130490', '점검창고176633', '점검창고251321');

COMMIT;
