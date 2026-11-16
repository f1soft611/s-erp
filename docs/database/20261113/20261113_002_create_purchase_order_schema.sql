-- 발주 헤더/상세 테이블 생성
-- 선행 조건: public.tb_tenant, tb_user, tb_department, tb_material_info,
-- tb_customer_info, tb_warehouse, tb_purchase_request_dt, 20261113_001(부가세구분 공통코드).
-- 이 스크립트는 실제 DB에 적용되지 않았다.
-- 원본 MES: TMA107(발주 메인), TMA108(발주 상세)

BEGIN;

CREATE TABLE public.tb_purchase_order_hd (
    purchase_order_id BIGSERIAL NOT NULL,
    tenant_id BIGINT NOT NULL,
    order_no VARCHAR(30) NOT NULL,
    order_dt DATE NOT NULL,
    supplier_id BIGINT NOT NULL,
    orderer_id BIGINT NOT NULL,
    order_dept_id BIGINT,
    currency_code VARCHAR(10) NOT NULL DEFAULT 'KRW',
    source_type VARCHAR(10) NOT NULL,
    tax_type VARCHAR(20) NOT NULL DEFAULT 'TAXABLE',
    vat_included_at CHAR(1) NOT NULL DEFAULT 'N',
    supply_amt NUMERIC(15,2) NOT NULL DEFAULT 0,
    vat_amt NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_amt NUMERIC(15,2) NOT NULL DEFAULT 0,
    print_at CHAR(1) NOT NULL DEFAULT 'N',
    remark VARCHAR(500),
    use_at CHAR(1) NOT NULL DEFAULT 'Y',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT pk_purchase_order_hd PRIMARY KEY (purchase_order_id),
    CONSTRAINT uq_purchase_order_hd_tenant_no UNIQUE (tenant_id, order_no),
    CONSTRAINT uq_purchase_order_hd_id_tenant UNIQUE (purchase_order_id, tenant_id),
    CONSTRAINT fk_purchase_order_hd_tenant FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id),
    CONSTRAINT fk_purchase_order_hd_supplier FOREIGN KEY (supplier_id, tenant_id)
        REFERENCES public.tb_customer_info (customer_id, tenant_id),
    CONSTRAINT fk_purchase_order_hd_orderer FOREIGN KEY (orderer_id)
        REFERENCES public.tb_user (user_id),
    CONSTRAINT fk_purchase_order_hd_dept FOREIGN KEY (order_dept_id)
        REFERENCES public.tb_department (department_id),
    CONSTRAINT ck_purchase_order_hd_source_type CHECK (source_type IN ('CONFIRM', 'DIRECT')),
    CONSTRAINT ck_purchase_order_hd_vat_included_at CHECK (vat_included_at IN ('Y', 'N')),
    CONSTRAINT ck_purchase_order_hd_tax_vat CHECK (tax_type = 'TAXABLE' OR vat_included_at = 'N'),
    CONSTRAINT ck_purchase_order_hd_print_at CHECK (print_at IN ('Y', 'N')),
    CONSTRAINT ck_purchase_order_hd_use_at CHECK (use_at IN ('Y', 'N'))
);

CREATE TABLE public.tb_purchase_order_dt (
    purchase_order_detail_id BIGSERIAL NOT NULL,
    purchase_order_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    line_no INTEGER NOT NULL,
    purchase_request_detail_id BIGINT NOT NULL,
    material_id BIGINT NOT NULL,
    order_qty NUMERIC(15,2) NOT NULL,
    unit_price NUMERIC(15,2),
    delivery_dt DATE NOT NULL,
    warehouse_id BIGINT NOT NULL,
    order_type VARCHAR(50) NOT NULL,
    use_type VARCHAR(50) NOT NULL,
    inspect_at CHAR(1) NOT NULL DEFAULT 'N',
    supply_amt NUMERIC(15,2) NOT NULL DEFAULT 0,
    vat_amt NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_amt NUMERIC(15,2) NOT NULL DEFAULT 0,
    receipt_close_at CHAR(1) NOT NULL DEFAULT 'N',
    remark VARCHAR(500),
    created_by VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT pk_purchase_order_dt PRIMARY KEY (purchase_order_detail_id),
    CONSTRAINT uq_purchase_order_dt_line UNIQUE (purchase_order_id, line_no),
    CONSTRAINT fk_purchase_order_dt_hd FOREIGN KEY (purchase_order_id, tenant_id)
        REFERENCES public.tb_purchase_order_hd (purchase_order_id, tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_purchase_order_dt_request_dt FOREIGN KEY (purchase_request_detail_id)
        REFERENCES public.tb_purchase_request_dt (purchase_request_detail_id),
    CONSTRAINT fk_purchase_order_dt_material FOREIGN KEY (material_id, tenant_id)
        REFERENCES public.tb_material_info (material_id, tenant_id),
    CONSTRAINT fk_purchase_order_dt_warehouse FOREIGN KEY (warehouse_id)
        REFERENCES public.tb_warehouse (warehouse_id),
    CONSTRAINT ck_purchase_order_dt_line_no CHECK (line_no > 0),
    CONSTRAINT ck_purchase_order_dt_order_qty CHECK (order_qty > 0),
    CONSTRAINT ck_purchase_order_dt_unit_price CHECK (unit_price IS NULL OR unit_price >= 0),
    CONSTRAINT ck_purchase_order_dt_inspect_at CHECK (inspect_at IN ('Y', 'N')),
    CONSTRAINT ck_purchase_order_dt_receipt_close_at CHECK (receipt_close_at IN ('Y', 'N'))
);

CREATE INDEX ix_purchase_order_hd_tenant_order_dt
    ON public.tb_purchase_order_hd USING btree (tenant_id, order_dt);
CREATE INDEX ix_purchase_order_hd_tenant_supplier
    ON public.tb_purchase_order_hd USING btree (tenant_id, supplier_id);
CREATE INDEX ix_purchase_order_dt_request_dt
    ON public.tb_purchase_order_dt USING btree (purchase_request_detail_id);
CREATE INDEX ix_purchase_order_dt_tenant_material
    ON public.tb_purchase_order_dt USING btree (tenant_id, material_id);

COMMENT ON TABLE public.tb_purchase_order_hd IS '발주 헤더(구매처 1곳, 통화 1종)';
COMMENT ON COLUMN public.tb_purchase_order_hd.purchase_order_id IS '발주 내부 식별자(PK)';
COMMENT ON COLUMN public.tb_purchase_order_hd.tenant_id IS '테넌트 ID(FK)';
COMMENT ON COLUMN public.tb_purchase_order_hd.order_no IS '발주번호(PO-yyyyMMdd-NNNN)';
COMMENT ON COLUMN public.tb_purchase_order_hd.order_dt IS '발주일';
COMMENT ON COLUMN public.tb_purchase_order_hd.supplier_id IS '구매처 거래처 ID(FK)';
COMMENT ON COLUMN public.tb_purchase_order_hd.orderer_id IS '발주자 사용자 ID(FK)';
COMMENT ON COLUMN public.tb_purchase_order_hd.order_dept_id IS '발주부서 ID(FK)';
COMMENT ON COLUMN public.tb_purchase_order_hd.currency_code IS '통화';
COMMENT ON COLUMN public.tb_purchase_order_hd.source_type IS '출처(CONFIRM 확정 불러오기/DIRECT 직접 발주)';
COMMENT ON COLUMN public.tb_purchase_order_hd.tax_type IS '부가세구분(공통코드 PURCHASE_TAX_TYPE)';
COMMENT ON COLUMN public.tb_purchase_order_hd.vat_included_at IS '부가세 포함 여부(Y 포함/N 미포함, 과세만 Y 가능)';
COMMENT ON COLUMN public.tb_purchase_order_hd.supply_amt IS '공급가액 합계';
COMMENT ON COLUMN public.tb_purchase_order_hd.vat_amt IS '부가세액 합계';
COMMENT ON COLUMN public.tb_purchase_order_hd.total_amt IS '합계금액';
COMMENT ON COLUMN public.tb_purchase_order_hd.print_at IS '발주서 출력 여부(Y/N)';
COMMENT ON COLUMN public.tb_purchase_order_hd.remark IS '비고';
COMMENT ON COLUMN public.tb_purchase_order_hd.use_at IS '사용여부(Y/N, N이면 취소)';
COMMENT ON COLUMN public.tb_purchase_order_hd.created_by IS '등록자';
COMMENT ON COLUMN public.tb_purchase_order_hd.created_at IS '등록일시';
COMMENT ON COLUMN public.tb_purchase_order_hd.updated_by IS '수정자';
COMMENT ON COLUMN public.tb_purchase_order_hd.updated_at IS '수정일시';

COMMENT ON TABLE public.tb_purchase_order_dt IS '발주 상세(품목별)';
COMMENT ON COLUMN public.tb_purchase_order_dt.purchase_order_detail_id IS '발주 상세 내부 식별자(PK)';
COMMENT ON COLUMN public.tb_purchase_order_dt.purchase_order_id IS '발주 내부 식별자(FK)';
COMMENT ON COLUMN public.tb_purchase_order_dt.tenant_id IS '테넌트 ID(헤더 FK 범위)';
COMMENT ON COLUMN public.tb_purchase_order_dt.line_no IS '행 순번';
COMMENT ON COLUMN public.tb_purchase_order_dt.purchase_request_detail_id IS '연결 구매요청(확정) 상세 ID(FK, 분할발주 시 중복 가능)';
COMMENT ON COLUMN public.tb_purchase_order_dt.material_id IS '품목 ID(FK)';
COMMENT ON COLUMN public.tb_purchase_order_dt.order_qty IS '발주수량';
COMMENT ON COLUMN public.tb_purchase_order_dt.unit_price IS '발주단가(빈값 허용)';
COMMENT ON COLUMN public.tb_purchase_order_dt.delivery_dt IS '납기일';
COMMENT ON COLUMN public.tb_purchase_order_dt.warehouse_id IS '입고창고 ID(FK)';
COMMENT ON COLUMN public.tb_purchase_order_dt.order_type IS '발주구분(공통코드 PURCHASE_ORDER_TYPE)';
COMMENT ON COLUMN public.tb_purchase_order_dt.use_type IS '사용용도(공통코드 PURCHASE_USE_TYPE)';
COMMENT ON COLUMN public.tb_purchase_order_dt.inspect_at IS '검사대상 여부(Y/N, 기본값은 품목 inspect_type)';
COMMENT ON COLUMN public.tb_purchase_order_dt.supply_amt IS '공급가액';
COMMENT ON COLUMN public.tb_purchase_order_dt.vat_amt IS '부가세액';
COMMENT ON COLUMN public.tb_purchase_order_dt.total_amt IS '합계금액';
COMMENT ON COLUMN public.tb_purchase_order_dt.receipt_close_at IS '입고대기 마감 여부(Y/N)';
COMMENT ON COLUMN public.tb_purchase_order_dt.remark IS '비고';
COMMENT ON COLUMN public.tb_purchase_order_dt.created_by IS '등록자';
COMMENT ON COLUMN public.tb_purchase_order_dt.created_at IS '등록일시';
COMMENT ON COLUMN public.tb_purchase_order_dt.updated_by IS '수정자';
COMMENT ON COLUMN public.tb_purchase_order_dt.updated_at IS '수정일시';

COMMIT;
