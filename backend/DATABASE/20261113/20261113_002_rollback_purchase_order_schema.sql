-- 발주 헤더/상세 테이블 롤백
-- 주의: 발주 데이터가 있으면 함께 삭제된다. 실행 전 데이터 존재 여부를 먼저 확인한다.

BEGIN;

DROP TABLE IF EXISTS public.tb_purchase_order_dt;
DROP TABLE IF EXISTS public.tb_purchase_order_hd;

COMMIT;
