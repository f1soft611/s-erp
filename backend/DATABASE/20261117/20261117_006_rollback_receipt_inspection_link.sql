-- 입고 상세의 수입검사 행 연결 컬럼 롤백
-- 주의: 수입검사 합격분 입고가 있으면 검사 연결 정보(검사 행 ID, 검사번호)가 함께 사라진다. 실행 전 연결 데이터 존재 여부를 확인한다.
-- 입고 행과 입고 데이터 자체는 삭제하지 않는다.

BEGIN;

DROP INDEX IF EXISTS public.ix_material_receipt_dt_inspection_dt;

ALTER TABLE public.tb_material_receipt_dt
    DROP CONSTRAINT IF EXISTS fk_material_receipt_dt_inspection_dt;

ALTER TABLE public.tb_material_receipt_dt
    DROP COLUMN IF EXISTS inspection_no,
    DROP COLUMN IF EXISTS material_inspection_detail_id;

COMMIT;
