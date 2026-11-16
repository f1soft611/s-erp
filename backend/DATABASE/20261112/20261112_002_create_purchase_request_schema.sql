-- 구매요청 헤더/상세 테이블 생성
-- 선행 조건: public.tb_tenant, tb_user, tb_department, tb_material_info,
-- tb_customer_info, tb_warehouse, tb_sales_order_hd, tb_sales_order_dt.
-- 이 스크립트는 실제 DB에 적용되지 않았다.
-- 원본 MES: TMA103(요청 메인), TMA103A(확정 메인), TMA104(요청 상세)

BEGIN;

CREATE TABLE public.tb_purchase_request_hd (
    purchase_request_id BIGSERIAL NOT NULL,
    tenant_id BIGINT NOT NULL,
    request_no VARCHAR(30) NOT NULL,
    request_dt DATE NOT NULL,
    requester_id BIGINT NOT NULL,
    request_dept_id BIGINT,
    status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    confirm_dt DATE,
    confirmer_id BIGINT,
    total_amt NUMERIC(15,2) NOT NULL DEFAULT 0,
    remark VARCHAR(500),
    use_at CHAR(1) NOT NULL DEFAULT 'Y',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT pk_purchase_request_hd PRIMARY KEY (purchase_request_id),
    CONSTRAINT uq_purchase_request_hd_tenant_no UNIQUE (tenant_id, request_no),
    CONSTRAINT uq_purchase_request_hd_id_tenant UNIQUE (purchase_request_id, tenant_id),
    CONSTRAINT fk_purchase_request_hd_tenant FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id),
    CONSTRAINT fk_purchase_request_hd_requester FOREIGN KEY (requester_id)
        REFERENCES public.tb_user (user_id),
    CONSTRAINT fk_purchase_request_hd_confirmer FOREIGN KEY (confirmer_id)
        REFERENCES public.tb_user (user_id),
    CONSTRAINT fk_purchase_request_hd_dept FOREIGN KEY (request_dept_id)
        REFERENCES public.tb_department (department_id),
    CONSTRAINT ck_purchase_request_hd_status
        CHECK (status IN ('REQUESTED', 'CONFIRMED')),
    CONSTRAINT ck_purchase_request_hd_confirmed
        CHECK (status = 'REQUESTED' OR (confirm_dt IS NOT NULL AND confirmer_id IS NOT NULL)),
    CONSTRAINT ck_purchase_request_hd_use_at CHECK (use_at IN ('Y', 'N'))
);

CREATE TABLE public.tb_purchase_request_dt (
    purchase_request_detail_id BIGSERIAL NOT NULL,
    purchase_request_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    line_no INTEGER NOT NULL,
    material_id BIGINT NOT NULL,
    request_qty NUMERIC(15,2) NOT NULL,
    request_delivery_dt DATE NOT NULL,
    use_type VARCHAR(50) NOT NULL,
    request_remark VARCHAR(500),
    confirm_qty NUMERIC(15,2),
    confirm_delivery_dt DATE,
    supplier_id BIGINT,
    warehouse_id BIGINT,
    order_type VARCHAR(50),
    unit_price NUMERIC(15,2),
    currency_code VARCHAR(10),
    amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    confirm_remark VARCHAR(500),
    order_close_at CHAR(1) NOT NULL DEFAULT 'N',
    sales_order_id BIGINT,
    sales_order_detail_id BIGINT,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT pk_purchase_request_dt PRIMARY KEY (purchase_request_detail_id),
    CONSTRAINT uq_purchase_request_dt_line UNIQUE (purchase_request_id, line_no),
    CONSTRAINT fk_purchase_request_dt_hd FOREIGN KEY (purchase_request_id, tenant_id)
        REFERENCES public.tb_purchase_request_hd (purchase_request_id, tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_purchase_request_dt_material FOREIGN KEY (material_id, tenant_id)
        REFERENCES public.tb_material_info (material_id, tenant_id),
    CONSTRAINT fk_purchase_request_dt_supplier FOREIGN KEY (supplier_id, tenant_id)
        REFERENCES public.tb_customer_info (customer_id, tenant_id),
    CONSTRAINT fk_purchase_request_dt_warehouse FOREIGN KEY (warehouse_id)
        REFERENCES public.tb_warehouse (warehouse_id),
    CONSTRAINT fk_purchase_request_dt_sales_order FOREIGN KEY (sales_order_id)
        REFERENCES public.tb_sales_order_hd (sales_order_id),
    CONSTRAINT fk_purchase_request_dt_sales_order_detail FOREIGN KEY (sales_order_detail_id)
        REFERENCES public.tb_sales_order_dt (sales_order_detail_id),
    CONSTRAINT ck_purchase_request_dt_line_no CHECK (line_no > 0),
    CONSTRAINT ck_purchase_request_dt_request_qty CHECK (request_qty > 0),
    CONSTRAINT ck_purchase_request_dt_confirm_qty CHECK (confirm_qty IS NULL OR confirm_qty >= 0),
    CONSTRAINT ck_purchase_request_dt_unit_price CHECK (unit_price IS NULL OR unit_price >= 0),
    CONSTRAINT ck_purchase_request_dt_order_close_at CHECK (order_close_at IN ('Y', 'N'))
);

CREATE INDEX ix_purchase_request_hd_tenant_request_dt
    ON public.tb_purchase_request_hd USING btree (tenant_id, request_dt);
CREATE INDEX ix_purchase_request_dt_tenant_material
    ON public.tb_purchase_request_dt USING btree (tenant_id, material_id);
CREATE INDEX ix_purchase_request_dt_sales_order_detail
    ON public.tb_purchase_request_dt USING btree (sales_order_detail_id);

COMMENT ON TABLE public.tb_purchase_request_hd IS '구매요청 헤더(확정 정보 포함)';
COMMENT ON COLUMN public.tb_purchase_request_hd.purchase_request_id IS '구매요청 내부 식별자(PK)';
COMMENT ON COLUMN public.tb_purchase_request_hd.tenant_id IS '테넌트 ID(FK)';
COMMENT ON COLUMN public.tb_purchase_request_hd.request_no IS '구매요청번호(MR-yyyyMMdd-NNNN)';
COMMENT ON COLUMN public.tb_purchase_request_hd.request_dt IS '요청일';
COMMENT ON COLUMN public.tb_purchase_request_hd.requester_id IS '요청자 사용자 ID(FK)';
COMMENT ON COLUMN public.tb_purchase_request_hd.request_dept_id IS '요청부서 ID(FK)';
COMMENT ON COLUMN public.tb_purchase_request_hd.status IS '상태(REQUESTED 요청/CONFIRMED 확정)';
COMMENT ON COLUMN public.tb_purchase_request_hd.confirm_dt IS '확정일';
COMMENT ON COLUMN public.tb_purchase_request_hd.confirmer_id IS '확정자 사용자 ID(FK)';
COMMENT ON COLUMN public.tb_purchase_request_hd.total_amt IS '상세 금액 합계';
COMMENT ON COLUMN public.tb_purchase_request_hd.remark IS '비고';
COMMENT ON COLUMN public.tb_purchase_request_hd.use_at IS '사용여부(Y/N)';
COMMENT ON COLUMN public.tb_purchase_request_hd.created_by IS '등록자';
COMMENT ON COLUMN public.tb_purchase_request_hd.created_at IS '등록일시';
COMMENT ON COLUMN public.tb_purchase_request_hd.updated_by IS '수정자';
COMMENT ON COLUMN public.tb_purchase_request_hd.updated_at IS '수정일시';

COMMENT ON TABLE public.tb_purchase_request_dt IS '구매요청 상세(품목별, 확정 정보 포함)';
COMMENT ON COLUMN public.tb_purchase_request_dt.purchase_request_detail_id IS '구매요청 상세 내부 식별자(PK)';
COMMENT ON COLUMN public.tb_purchase_request_dt.purchase_request_id IS '구매요청 내부 식별자(FK)';
COMMENT ON COLUMN public.tb_purchase_request_dt.tenant_id IS '테넌트 ID(헤더 FK 범위)';
COMMENT ON COLUMN public.tb_purchase_request_dt.line_no IS '행 순번';
COMMENT ON COLUMN public.tb_purchase_request_dt.material_id IS '품목 ID(FK)';
COMMENT ON COLUMN public.tb_purchase_request_dt.request_qty IS '요청수량';
COMMENT ON COLUMN public.tb_purchase_request_dt.request_delivery_dt IS '요청납기일';
COMMENT ON COLUMN public.tb_purchase_request_dt.use_type IS '사용용도(공통코드 PURCHASE_USE_TYPE)';
COMMENT ON COLUMN public.tb_purchase_request_dt.request_remark IS '비고(요청)';
COMMENT ON COLUMN public.tb_purchase_request_dt.confirm_qty IS '확정수량';
COMMENT ON COLUMN public.tb_purchase_request_dt.confirm_delivery_dt IS '확정납기일';
COMMENT ON COLUMN public.tb_purchase_request_dt.supplier_id IS '구매처 거래처 ID(FK)';
COMMENT ON COLUMN public.tb_purchase_request_dt.warehouse_id IS '입고창고 ID(FK)';
COMMENT ON COLUMN public.tb_purchase_request_dt.order_type IS '발주구분(공통코드 PURCHASE_ORDER_TYPE)';
COMMENT ON COLUMN public.tb_purchase_request_dt.unit_price IS '단가(빈값 허용)';
COMMENT ON COLUMN public.tb_purchase_request_dt.currency_code IS '통화';
COMMENT ON COLUMN public.tb_purchase_request_dt.amount IS '금액(확정수량 x 단가)';
COMMENT ON COLUMN public.tb_purchase_request_dt.confirm_remark IS '비고(확정)';
COMMENT ON COLUMN public.tb_purchase_request_dt.order_close_at IS '발주대기 마감 여부(Y/N)';
COMMENT ON COLUMN public.tb_purchase_request_dt.sales_order_id IS '연결 수주 ID(없으면 직접 요청)';
COMMENT ON COLUMN public.tb_purchase_request_dt.sales_order_detail_id IS '연결 수주 상세 ID';
COMMENT ON COLUMN public.tb_purchase_request_dt.created_by IS '등록자';
COMMENT ON COLUMN public.tb_purchase_request_dt.created_at IS '등록일시';
COMMENT ON COLUMN public.tb_purchase_request_dt.updated_by IS '수정자';
COMMENT ON COLUMN public.tb_purchase_request_dt.updated_at IS '수정일시';

COMMIT;
