-- 입고 헤더/상세 테이블 생성
-- 선행 조건: public.tb_tenant, tb_user, tb_department, tb_material_info, tb_customer_info, tb_warehouse,
-- tb_purchase_order_dt, 20261116_002(가입고 스키마 tb_material_arrival_hd/dt).
-- 이 스크립트는 실제 DB에 적용되지 않았다.
-- 원본 MES: TMA205(입고 메인), TMA206(입고 상세) — 참고용이며 LOCATION·실입고량·사용용도·수주/생산 연계·도면·매입마감·재고/LOT 값 컬럼은 제외했다.

BEGIN;

CREATE TABLE public.tb_material_receipt_hd (
    material_receipt_id BIGSERIAL NOT NULL,
    tenant_id BIGINT NOT NULL,
    receipt_no VARCHAR(30) NOT NULL,
    receipt_dt DATE NOT NULL,
    supplier_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    receiver_dept_id BIGINT,
    currency_code VARCHAR(10) NOT NULL DEFAULT 'KRW',
    tax_type VARCHAR(20) NOT NULL DEFAULT 'TAXABLE',
    vat_included_at CHAR(1) NOT NULL DEFAULT 'N',
    supply_amt NUMERIC(15,2) NOT NULL DEFAULT 0,
    vat_amt NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_amt NUMERIC(15,2) NOT NULL DEFAULT 0,
    remark VARCHAR(500),
    use_at CHAR(1) NOT NULL DEFAULT 'Y',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT pk_material_receipt_hd PRIMARY KEY (material_receipt_id),
    CONSTRAINT uq_material_receipt_hd_tenant_no UNIQUE (tenant_id, receipt_no),
    CONSTRAINT uq_material_receipt_hd_id_tenant UNIQUE (material_receipt_id, tenant_id),
    CONSTRAINT fk_material_receipt_hd_tenant FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id),
    CONSTRAINT fk_material_receipt_hd_supplier FOREIGN KEY (supplier_id, tenant_id)
        REFERENCES public.tb_customer_info (customer_id, tenant_id),
    CONSTRAINT fk_material_receipt_hd_receiver FOREIGN KEY (receiver_id)
        REFERENCES public.tb_user (user_id),
    CONSTRAINT fk_material_receipt_hd_dept FOREIGN KEY (receiver_dept_id)
        REFERENCES public.tb_department (department_id),
    CONSTRAINT ck_material_receipt_hd_vat_included_at CHECK (vat_included_at IN ('Y', 'N')),
    CONSTRAINT ck_material_receipt_hd_tax_vat CHECK (tax_type = 'TAXABLE' OR vat_included_at = 'N'),
    CONSTRAINT ck_material_receipt_hd_use_at CHECK (use_at IN ('Y', 'N'))
);

CREATE TABLE public.tb_material_receipt_dt (
    material_receipt_detail_id BIGSERIAL NOT NULL,
    material_receipt_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    line_no INTEGER NOT NULL,
    material_arrival_detail_id BIGINT,
    arrival_no VARCHAR(30) NOT NULL,
    purchase_order_detail_id BIGINT NOT NULL,
    material_id BIGINT NOT NULL,
    receipt_qty NUMERIC(15,2) NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    supply_amt NUMERIC(15,2) NOT NULL DEFAULT 0,
    vat_amt NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_amt NUMERIC(15,2) NOT NULL DEFAULT 0,
    warehouse_id BIGINT NOT NULL,
    manufacture_dt DATE,
    expire_dt DATE,
    lot_no VARCHAR(50),
    remark VARCHAR(500),
    created_by VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT pk_material_receipt_dt PRIMARY KEY (material_receipt_detail_id),
    CONSTRAINT uq_material_receipt_dt_line UNIQUE (material_receipt_id, line_no),
    CONSTRAINT fk_material_receipt_dt_hd FOREIGN KEY (material_receipt_id, tenant_id)
        REFERENCES public.tb_material_receipt_hd (material_receipt_id, tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_material_receipt_dt_arrival_dt FOREIGN KEY (material_arrival_detail_id)
        REFERENCES public.tb_material_arrival_dt (material_arrival_detail_id) ON DELETE SET NULL,
    CONSTRAINT fk_material_receipt_dt_order_dt FOREIGN KEY (purchase_order_detail_id)
        REFERENCES public.tb_purchase_order_dt (purchase_order_detail_id),
    CONSTRAINT fk_material_receipt_dt_material FOREIGN KEY (material_id, tenant_id)
        REFERENCES public.tb_material_info (material_id, tenant_id),
    CONSTRAINT fk_material_receipt_dt_warehouse FOREIGN KEY (warehouse_id)
        REFERENCES public.tb_warehouse (warehouse_id),
    CONSTRAINT ck_material_receipt_dt_line_no CHECK (line_no > 0),
    CONSTRAINT ck_material_receipt_dt_receipt_qty CHECK (receipt_qty > 0),
    CONSTRAINT ck_material_receipt_dt_unit_price CHECK (unit_price >= 0),
    CONSTRAINT ck_material_receipt_dt_expire_dt CHECK (
        manufacture_dt IS NULL OR expire_dt IS NULL OR expire_dt >= manufacture_dt
    )
);

CREATE INDEX ix_material_receipt_hd_tenant_receipt_dt
    ON public.tb_material_receipt_hd USING btree (tenant_id, receipt_dt);
CREATE INDEX ix_material_receipt_hd_tenant_supplier
    ON public.tb_material_receipt_hd USING btree (tenant_id, supplier_id);
CREATE INDEX ix_material_receipt_dt_arrival_dt
    ON public.tb_material_receipt_dt USING btree (material_arrival_detail_id);
CREATE INDEX ix_material_receipt_dt_order_dt
    ON public.tb_material_receipt_dt USING btree (purchase_order_detail_id);
CREATE INDEX ix_material_receipt_dt_tenant_material
    ON public.tb_material_receipt_dt USING btree (tenant_id, material_id);

COMMENT ON TABLE public.tb_material_receipt_hd IS '입고 헤더(구매처 1곳, 통화 1종)';
COMMENT ON COLUMN public.tb_material_receipt_hd.material_receipt_id IS '입고 내부 식별자(PK)';
COMMENT ON COLUMN public.tb_material_receipt_hd.tenant_id IS '테넌트 ID(FK)';
COMMENT ON COLUMN public.tb_material_receipt_hd.receipt_no IS '입고번호(MI-yyyyMMdd-NNNN)';
COMMENT ON COLUMN public.tb_material_receipt_hd.receipt_dt IS '입고일';
COMMENT ON COLUMN public.tb_material_receipt_hd.supplier_id IS '구매처 거래처 ID(FK)';
COMMENT ON COLUMN public.tb_material_receipt_hd.receiver_id IS '입고 담당자 사용자 ID(FK, 무검사 자동 입고는 가입고 담당자)';
COMMENT ON COLUMN public.tb_material_receipt_hd.receiver_dept_id IS '입고 담당 부서 ID(FK)';
COMMENT ON COLUMN public.tb_material_receipt_hd.currency_code IS '통화';
COMMENT ON COLUMN public.tb_material_receipt_hd.tax_type IS '부가세구분(공통코드 PURCHASE_TAX_TYPE)';
COMMENT ON COLUMN public.tb_material_receipt_hd.vat_included_at IS '부가세 포함 여부(Y 포함/N 미포함, 과세만 Y 가능)';
COMMENT ON COLUMN public.tb_material_receipt_hd.supply_amt IS '공급가액 합계';
COMMENT ON COLUMN public.tb_material_receipt_hd.vat_amt IS '부가세액 합계';
COMMENT ON COLUMN public.tb_material_receipt_hd.total_amt IS '합계금액';
COMMENT ON COLUMN public.tb_material_receipt_hd.remark IS '비고';
COMMENT ON COLUMN public.tb_material_receipt_hd.use_at IS '사용여부(Y/N, N이면 취소)';
COMMENT ON COLUMN public.tb_material_receipt_hd.created_by IS '등록자';
COMMENT ON COLUMN public.tb_material_receipt_hd.created_at IS '등록일시';
COMMENT ON COLUMN public.tb_material_receipt_hd.updated_by IS '수정자';
COMMENT ON COLUMN public.tb_material_receipt_hd.updated_at IS '수정일시';

COMMENT ON TABLE public.tb_material_receipt_dt IS '입고 상세(품목별)';
COMMENT ON COLUMN public.tb_material_receipt_dt.material_receipt_detail_id IS '입고 상세 내부 식별자(PK)';
COMMENT ON COLUMN public.tb_material_receipt_dt.material_receipt_id IS '입고 내부 식별자(FK)';
COMMENT ON COLUMN public.tb_material_receipt_dt.tenant_id IS '테넌트 ID(헤더 FK 범위)';
COMMENT ON COLUMN public.tb_material_receipt_dt.line_no IS '행 순번';
COMMENT ON COLUMN public.tb_material_receipt_dt.material_arrival_detail_id IS '연결 가입고 상세 ID(FK, 가입고 행이 삭제되면 NULL로 남아 입고 이력만 보존, 분할 입고 시 중복 가능)';
COMMENT ON COLUMN public.tb_material_receipt_dt.arrival_no IS '가입고번호 복사본(이력·화면 표시용)';
COMMENT ON COLUMN public.tb_material_receipt_dt.purchase_order_detail_id IS '연결 발주 상세 ID(FK)';
COMMENT ON COLUMN public.tb_material_receipt_dt.material_id IS '품목 ID(FK)';
COMMENT ON COLUMN public.tb_material_receipt_dt.receipt_qty IS '입고수량';
COMMENT ON COLUMN public.tb_material_receipt_dt.unit_price IS '입고단가(0 허용)';
COMMENT ON COLUMN public.tb_material_receipt_dt.supply_amt IS '공급가액';
COMMENT ON COLUMN public.tb_material_receipt_dt.vat_amt IS '부가세액';
COMMENT ON COLUMN public.tb_material_receipt_dt.total_amt IS '합계금액';
COMMENT ON COLUMN public.tb_material_receipt_dt.warehouse_id IS '입고창고 ID(FK, 기본값은 가입고 행 창고)';
COMMENT ON COLUMN public.tb_material_receipt_dt.manufacture_dt IS '제조일';
COMMENT ON COLUMN public.tb_material_receipt_dt.expire_dt IS '소비기한';
COMMENT ON COLUMN public.tb_material_receipt_dt.lot_no IS 'LOT번호(재고 연결 후 채움, 현재 빈값)';
COMMENT ON COLUMN public.tb_material_receipt_dt.remark IS '비고';
COMMENT ON COLUMN public.tb_material_receipt_dt.created_by IS '등록자';
COMMENT ON COLUMN public.tb_material_receipt_dt.created_at IS '등록일시';
COMMENT ON COLUMN public.tb_material_receipt_dt.updated_by IS '수정자';
COMMENT ON COLUMN public.tb_material_receipt_dt.updated_at IS '수정일시';

COMMIT;
