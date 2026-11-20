-- 20261120_004 롤백: 점검창고 3건을 정리 전 상태(불용창고, 사용)로 되돌린다.
BEGIN;
UPDATE public.tb_warehouse
   SET disuse_at = 'Y',
       use_at = 'Y',
       updated_at = CURRENT_TIMESTAMP
 WHERE warehouse_name IN ('점검창고130490', '점검창고176633', '점검창고251321');
COMMIT;
