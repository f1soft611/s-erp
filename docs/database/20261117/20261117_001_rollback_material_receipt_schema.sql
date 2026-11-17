-- 입고 헤더/상세 테이블 롤백
-- 주의: 입고 데이터가 있으면 함께 삭제된다. 실행 전 데이터 존재 여부를 먼저 확인한다.
-- 가입고 테이블과 가입고 데이터는 건드리지 않지만, 무검사 가입고의 입고 연결 정보는 함께 사라진다.

BEGIN;

DROP TABLE IF EXISTS public.tb_material_receipt_dt;
DROP TABLE IF EXISTS public.tb_material_receipt_hd;

COMMIT;
