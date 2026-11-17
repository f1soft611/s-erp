-- 가입고 헤더/상세 테이블 롤백
-- 주의: 가입고 데이터가 있으면 함께 삭제된다. 실행 전 데이터 존재 여부를 먼저 확인한다.

BEGIN;

DROP TABLE IF EXISTS public.tb_material_arrival_dt;
DROP TABLE IF EXISTS public.tb_material_arrival_hd;

COMMIT;
