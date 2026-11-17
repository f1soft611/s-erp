-- 자재 수입검사 헤더/상세 테이블 롤백
-- 주의: 수입검사 데이터가 있으면 함께 삭제된다. 실행 전 데이터 존재 여부를 먼저 확인한다.
-- 가입고·발주 테이블과 데이터는 건드리지 않는다. 검사 기록이 사라지면 해당 가입고 행의 잠금도 함께 풀린다.

BEGIN;

DROP TABLE IF EXISTS public.tb_material_inspection_dt;
DROP TABLE IF EXISTS public.tb_material_inspection_hd;

COMMIT;
