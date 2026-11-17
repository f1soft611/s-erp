-- 입고 상세에 수입검사 행 연결 컬럼 추가 (수입검사 합격분 입고)
-- 선행 조건: 20261117_001(입고 테이블), 20261117_004(수입검사 테이블).
-- 입고 가능량(검사 행) = 합격량 - 유효 입고의 입고수량 합이며 조회 시 계산한다. 기존 입고 행(무검사)은 두 컬럼이 NULL로 남는다.
-- 이 스크립트는 실제 DB에 적용되지 않았다.

BEGIN;

ALTER TABLE public.tb_material_receipt_dt
    ADD COLUMN material_inspection_detail_id BIGINT,
    ADD COLUMN inspection_no VARCHAR(30);

ALTER TABLE public.tb_material_receipt_dt
    ADD CONSTRAINT fk_material_receipt_dt_inspection_dt FOREIGN KEY (material_inspection_detail_id)
        REFERENCES public.tb_material_inspection_dt (material_inspection_detail_id) ON DELETE SET NULL;

CREATE INDEX ix_material_receipt_dt_inspection_dt
    ON public.tb_material_receipt_dt USING btree (material_inspection_detail_id);

COMMENT ON COLUMN public.tb_material_receipt_dt.material_inspection_detail_id IS '입고한 수입검사 상세 ID(FK, 검사 행이 삭제되면 NULL로 남아 입고 이력만 보존, 분할 입고 시 중복 가능, 무검사 입고 행은 NULL)';
COMMENT ON COLUMN public.tb_material_receipt_dt.inspection_no IS '검사번호 복사본(이력·화면 표시용, 무검사 입고 행은 NULL)';

COMMIT;
