-- 자재 수입검사 헤더/상세 테이블 생성
-- 선행 조건: public.tb_tenant, tb_user, tb_department, tb_material_info, tb_purchase_order_dt,
-- 20261116_002(가입고 스키마 tb_material_arrival_hd/dt).
-- 이 스크립트는 실제 DB에 적용되지 않았다.
-- 원본 MES: TQC205(검사 메인), TQC206(검사 상세) — 참고용이며 검사방법(샘플·무검사)·시료량·연속합격·특채조건·부적합 처리·
-- 검사항목별 결과(TQC206D)·사진·입고요청량(INPUT_REQ_QTY) 컬럼은 제외했다. 검사량은 합격량 + 불합격량으로 계산한다.

BEGIN;

CREATE TABLE public.tb_material_inspection_hd (
    material_inspection_id BIGSERIAL NOT NULL,
    tenant_id BIGINT NOT NULL,
    inspection_no VARCHAR(30) NOT NULL,
    inspection_dt DATE NOT NULL,
    inspector_id BIGINT NOT NULL,
    inspector_dept_id BIGINT,
    remark VARCHAR(500),
    use_at CHAR(1) NOT NULL DEFAULT 'Y',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT pk_material_inspection_hd PRIMARY KEY (material_inspection_id),
    CONSTRAINT uq_material_inspection_hd_tenant_no UNIQUE (tenant_id, inspection_no),
    CONSTRAINT uq_material_inspection_hd_id_tenant UNIQUE (material_inspection_id, tenant_id),
    CONSTRAINT fk_material_inspection_hd_tenant FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id),
    CONSTRAINT fk_material_inspection_hd_inspector FOREIGN KEY (inspector_id)
        REFERENCES public.tb_user (user_id),
    CONSTRAINT fk_material_inspection_hd_dept FOREIGN KEY (inspector_dept_id)
        REFERENCES public.tb_department (department_id),
    CONSTRAINT ck_material_inspection_hd_use_at CHECK (use_at IN ('Y', 'N'))
);

CREATE TABLE public.tb_material_inspection_dt (
    material_inspection_detail_id BIGSERIAL NOT NULL,
    material_inspection_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    line_no INTEGER NOT NULL,
    material_arrival_detail_id BIGINT,
    arrival_no VARCHAR(30) NOT NULL,
    purchase_order_detail_id BIGINT NOT NULL,
    material_id BIGINT NOT NULL,
    pass_qty NUMERIC(15,2) NOT NULL DEFAULT 0,
    fail_qty NUMERIC(15,2) NOT NULL DEFAULT 0,
    remark VARCHAR(500),
    created_by VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT pk_material_inspection_dt PRIMARY KEY (material_inspection_detail_id),
    CONSTRAINT uq_material_inspection_dt_line UNIQUE (material_inspection_id, line_no),
    CONSTRAINT fk_material_inspection_dt_hd FOREIGN KEY (material_inspection_id, tenant_id)
        REFERENCES public.tb_material_inspection_hd (material_inspection_id, tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_material_inspection_dt_arrival_dt FOREIGN KEY (material_arrival_detail_id)
        REFERENCES public.tb_material_arrival_dt (material_arrival_detail_id) ON DELETE SET NULL,
    CONSTRAINT fk_material_inspection_dt_order_dt FOREIGN KEY (purchase_order_detail_id)
        REFERENCES public.tb_purchase_order_dt (purchase_order_detail_id),
    CONSTRAINT fk_material_inspection_dt_material FOREIGN KEY (material_id, tenant_id)
        REFERENCES public.tb_material_info (material_id, tenant_id),
    CONSTRAINT ck_material_inspection_dt_line_no CHECK (line_no > 0),
    CONSTRAINT ck_material_inspection_dt_pass_qty CHECK (pass_qty >= 0),
    CONSTRAINT ck_material_inspection_dt_fail_qty CHECK (fail_qty >= 0),
    CONSTRAINT ck_material_inspection_dt_inspect_qty CHECK (pass_qty + fail_qty > 0)
);

CREATE INDEX ix_material_inspection_hd_tenant_inspection_dt
    ON public.tb_material_inspection_hd USING btree (tenant_id, inspection_dt);
CREATE INDEX ix_material_inspection_dt_arrival_dt
    ON public.tb_material_inspection_dt USING btree (material_arrival_detail_id);
CREATE INDEX ix_material_inspection_dt_order_dt
    ON public.tb_material_inspection_dt USING btree (purchase_order_detail_id);
CREATE INDEX ix_material_inspection_dt_tenant_material
    ON public.tb_material_inspection_dt USING btree (tenant_id, material_id);

COMMENT ON TABLE public.tb_material_inspection_hd IS '자재 수입검사 헤더(검사번호 1건에 가입고 행 여러 개를 묶음)';
COMMENT ON COLUMN public.tb_material_inspection_hd.material_inspection_id IS '수입검사 내부 식별자(PK)';
COMMENT ON COLUMN public.tb_material_inspection_hd.tenant_id IS '테넌트 ID(FK)';
COMMENT ON COLUMN public.tb_material_inspection_hd.inspection_no IS '검사번호(QI-yyyyMMdd-NNNN)';
COMMENT ON COLUMN public.tb_material_inspection_hd.inspection_dt IS '검사일';
COMMENT ON COLUMN public.tb_material_inspection_hd.inspector_id IS '검사자 사용자 ID(FK)';
COMMENT ON COLUMN public.tb_material_inspection_hd.inspector_dept_id IS '검사자 부서 ID(FK)';
COMMENT ON COLUMN public.tb_material_inspection_hd.remark IS '비고';
COMMENT ON COLUMN public.tb_material_inspection_hd.use_at IS '사용여부(Y/N, N이면 검사 취소)';
COMMENT ON COLUMN public.tb_material_inspection_hd.created_by IS '등록자';
COMMENT ON COLUMN public.tb_material_inspection_hd.created_at IS '등록일시';
COMMENT ON COLUMN public.tb_material_inspection_hd.updated_by IS '수정자';
COMMENT ON COLUMN public.tb_material_inspection_hd.updated_at IS '수정일시';

COMMENT ON TABLE public.tb_material_inspection_dt IS '자재 수입검사 상세(가입고 행별 합격/불합격 수량)';
COMMENT ON COLUMN public.tb_material_inspection_dt.material_inspection_detail_id IS '수입검사 상세 내부 식별자(PK)';
COMMENT ON COLUMN public.tb_material_inspection_dt.material_inspection_id IS '수입검사 내부 식별자(FK)';
COMMENT ON COLUMN public.tb_material_inspection_dt.tenant_id IS '테넌트 ID(헤더 FK 범위)';
COMMENT ON COLUMN public.tb_material_inspection_dt.line_no IS '행 순번';
COMMENT ON COLUMN public.tb_material_inspection_dt.material_arrival_detail_id IS '검사한 가입고 상세 ID(FK, 가입고 행이 삭제되면 NULL로 남아 검사 이력만 보존, 부분 검사로 같은 행에 여러 검사 가능)';
COMMENT ON COLUMN public.tb_material_inspection_dt.arrival_no IS '가입고번호 복사본(이력·화면 표시용)';
COMMENT ON COLUMN public.tb_material_inspection_dt.purchase_order_detail_id IS '연결 발주 상세 ID(FK, 발주 잔량에 불합격량을 더할 때 사용)';
COMMENT ON COLUMN public.tb_material_inspection_dt.material_id IS '품목 ID(FK)';
COMMENT ON COLUMN public.tb_material_inspection_dt.pass_qty IS '합격량(검사량 = 합격량 + 불합격량)';
COMMENT ON COLUMN public.tb_material_inspection_dt.fail_qty IS '불합격량(가입고 수량은 바꾸지 않고 발주 잔량에 더해 계산)';
COMMENT ON COLUMN public.tb_material_inspection_dt.remark IS '비고';
COMMENT ON COLUMN public.tb_material_inspection_dt.created_by IS '등록자';
COMMENT ON COLUMN public.tb_material_inspection_dt.created_at IS '등록일시';
COMMENT ON COLUMN public.tb_material_inspection_dt.updated_by IS '수정자';
COMMENT ON COLUMN public.tb_material_inspection_dt.updated_at IS '수정일시';

COMMIT;
