-- 입고 상세에 매입마감 컬럼 추가 (매입마감처리 화면)
-- 선행 조건: 20261117_001(입고 테이블).
-- 마감월이 NULL이면 미마감이다. 마감하면 마감월·마감일시·마감자와 마감 시점의 단가·세금 구분·공급가·부가세·합계를 저장하고,
-- 해제하면 아홉 컬럼을 모두 NULL로 되돌린다(입고 행의 원래 단가·금액은 바꾸지 않는다).
-- 기존 입고 행은 모두 미마감(NULL)으로 남는다. 이 스크립트는 실제 DB에 적용되지 않았다.

BEGIN;

ALTER TABLE public.tb_material_receipt_dt
    ADD COLUMN closing_month VARCHAR(6),
    ADD COLUMN closed_at TIMESTAMP,
    ADD COLUMN closed_by VARCHAR(100),
    ADD COLUMN closing_unit_price NUMERIC(15, 2),
    ADD COLUMN closing_tax_type VARCHAR(20),
    ADD COLUMN closing_vat_included_at CHAR(1),
    ADD COLUMN closing_supply_amt NUMERIC(15, 2),
    ADD COLUMN closing_vat_amt NUMERIC(15, 2),
    ADD COLUMN closing_total_amt NUMERIC(15, 2);

ALTER TABLE public.tb_material_receipt_dt
    ADD CONSTRAINT ck_material_receipt_dt_closing_month
        CHECK (closing_month IS NULL OR closing_month ~ '^[0-9]{4}(0[1-9]|1[0-2])$'),
    ADD CONSTRAINT ck_material_receipt_dt_closing_tax_type
        CHECK (closing_tax_type IS NULL OR closing_tax_type IN ('TAXABLE', 'ZERO_RATED', 'EXEMPT')),
    ADD CONSTRAINT ck_material_receipt_dt_closing_vat_included
        CHECK (closing_vat_included_at IS NULL OR closing_vat_included_at IN ('Y', 'N')),
    ADD CONSTRAINT ck_material_receipt_dt_closing_complete
        CHECK (closing_month IS NULL OR (
            closed_at IS NOT NULL
            AND closing_unit_price IS NOT NULL
            AND closing_tax_type IS NOT NULL
            AND closing_vat_included_at IS NOT NULL
            AND closing_supply_amt IS NOT NULL
            AND closing_vat_amt IS NOT NULL
            AND closing_total_amt IS NOT NULL
        ));

CREATE INDEX ix_material_receipt_dt_closing_month
    ON public.tb_material_receipt_dt USING btree (tenant_id, closing_month);

COMMENT ON COLUMN public.tb_material_receipt_dt.closing_month IS '매입마감월 YYYYMM(NULL이면 미마감)';
COMMENT ON COLUMN public.tb_material_receipt_dt.closed_at IS '매입마감 일시';
COMMENT ON COLUMN public.tb_material_receipt_dt.closed_by IS '매입마감자(로그인 ID)';
COMMENT ON COLUMN public.tb_material_receipt_dt.closing_unit_price IS '마감 단가(마감 시 조정 가능, 입고 단가 unit_price는 유지)';
COMMENT ON COLUMN public.tb_material_receipt_dt.closing_tax_type IS '마감 세금 구분(TAXABLE 과세/ZERO_RATED 영세/EXEMPT 면세)';
COMMENT ON COLUMN public.tb_material_receipt_dt.closing_vat_included_at IS '마감 부가세 포함 여부(Y 포함/N 별도, Y는 과세만 허용)';
COMMENT ON COLUMN public.tb_material_receipt_dt.closing_supply_amt IS '마감 공급가액(서버 계산)';
COMMENT ON COLUMN public.tb_material_receipt_dt.closing_vat_amt IS '마감 부가세액(서버 계산)';
COMMENT ON COLUMN public.tb_material_receipt_dt.closing_total_amt IS '마감 합계금액(서버 계산)';

COMMIT;
