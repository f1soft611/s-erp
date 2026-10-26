-- New environment only. Prerequisites: public.tb_tenant,
-- public.tb_customer_info, and public.tb_material_info with their current
-- tenant-aware unique keys. This script has not been applied to a database.

BEGIN;

CREATE TABLE public.tb_sales_order_hd (
    sales_order_id BIGSERIAL NOT NULL,
    tenant_id BIGINT NOT NULL,
    order_no VARCHAR(30) NOT NULL,
    order_dt DATE NOT NULL,
    customer_id BIGINT NOT NULL,
    quot_no VARCHAR(30),
    delivery_dt DATE,
    delivery_place VARCHAR(200),
    delivery_method VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT '수주등록',
    total_amt NUMERIC(15,2) DEFAULT 0,
    remark VARCHAR(500),
    use_at CHAR(1) NOT NULL DEFAULT 'Y',
    created_by VARCHAR(10),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(10),
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT pk_sales_order_hd PRIMARY KEY (sales_order_id),
    CONSTRAINT uq_sales_order_hd_tenant_order_no UNIQUE (tenant_id, order_no),
    CONSTRAINT uq_sales_order_hd_id_tenant UNIQUE (sales_order_id, tenant_id),
    CONSTRAINT fk_sales_order_hd_tenant FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id),
    CONSTRAINT fk_sales_order_hd_customer FOREIGN KEY (customer_id, tenant_id)
        REFERENCES public.tb_customer_info (customer_id, tenant_id),
    CONSTRAINT ck_sales_order_hd_status
        CHECK (status IN ('수주등록', '생산대기', '생산중', '출하완료', '취소')),
    CONSTRAINT ck_sales_order_hd_use_at CHECK (use_at IN ('Y', 'N'))
);

CREATE TABLE public.tb_sales_order_dt (
    sales_order_detail_id BIGSERIAL NOT NULL,
    sales_order_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    line_no INT NOT NULL,
    material_id BIGINT NOT NULL,
    order_qty NUMERIC(15,2) NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    supply_amt NUMERIC(15,2) NOT NULL,
    vat_amt NUMERIC(15,2) DEFAULT 0,
    total_amt NUMERIC(15,2) NOT NULL,
    delivery_dt DATE,
    shipped_qty NUMERIC(15,2) DEFAULT 0,
    line_status VARCHAR(20) DEFAULT '대기',
    CONSTRAINT pk_sales_order_dt PRIMARY KEY (sales_order_detail_id),
    CONSTRAINT uq_sales_order_dt_order_line UNIQUE (sales_order_id, line_no),
    CONSTRAINT fk_sales_order_dt_hd FOREIGN KEY (sales_order_id, tenant_id)
        REFERENCES public.tb_sales_order_hd (sales_order_id, tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_order_dt_material FOREIGN KEY (material_id, tenant_id)
        REFERENCES public.tb_material_info (material_id, tenant_id)
);

CREATE INDEX ix_sales_order_hd_tenant_order_dt
    ON public.tb_sales_order_hd USING btree (tenant_id, order_dt);
CREATE INDEX ix_sales_order_hd_tenant_customer
    ON public.tb_sales_order_hd USING btree (tenant_id, customer_id);
CREATE INDEX ix_sales_order_dt_material_id
    ON public.tb_sales_order_dt USING btree (material_id);

COMMENT ON TABLE public.tb_sales_order_hd IS '수주등록 헤더';
COMMENT ON COLUMN public.tb_sales_order_hd.sales_order_id IS '수주 내부 식별자(PK)';
COMMENT ON COLUMN public.tb_sales_order_hd.tenant_id IS '테넌트 ID(FK)';
COMMENT ON COLUMN public.tb_sales_order_hd.order_no IS '테넌트별 유일 수주번호';
COMMENT ON COLUMN public.tb_sales_order_hd.order_dt IS '수주일자';
COMMENT ON COLUMN public.tb_sales_order_hd.customer_id IS '거래처 ID(FK)';
COMMENT ON COLUMN public.tb_sales_order_hd.quot_no IS '견적번호(현재 견적 테이블 FK 없음)';
COMMENT ON COLUMN public.tb_sales_order_hd.delivery_dt IS '헤더 납기일자';
COMMENT ON COLUMN public.tb_sales_order_hd.delivery_place IS '납품장소';
COMMENT ON COLUMN public.tb_sales_order_hd.delivery_method IS '배송방법';
COMMENT ON COLUMN public.tb_sales_order_hd.status IS '수주상태';
COMMENT ON COLUMN public.tb_sales_order_hd.total_amt IS '수주 총금액';
COMMENT ON COLUMN public.tb_sales_order_hd.remark IS '비고';
COMMENT ON COLUMN public.tb_sales_order_hd.use_at IS '사용여부(Y/N)';
COMMENT ON COLUMN public.tb_sales_order_hd.created_by IS '등록자';
COMMENT ON COLUMN public.tb_sales_order_hd.created_at IS '등록일시';
COMMENT ON COLUMN public.tb_sales_order_hd.updated_by IS '수정자';
COMMENT ON COLUMN public.tb_sales_order_hd.updated_at IS '수정일시';

COMMENT ON TABLE public.tb_sales_order_dt IS '수주등록 상세(품목별)';
COMMENT ON COLUMN public.tb_sales_order_dt.sales_order_detail_id IS '수주상세 내부 식별자(PK)';
COMMENT ON COLUMN public.tb_sales_order_dt.sales_order_id IS '수주 내부 식별자(FK)';
COMMENT ON COLUMN public.tb_sales_order_dt.tenant_id IS '테넌트 ID(헤더 FK 범위)';
COMMENT ON COLUMN public.tb_sales_order_dt.line_no IS '수주라인번호';
COMMENT ON COLUMN public.tb_sales_order_dt.material_id IS '품목 ID(FK)';
COMMENT ON COLUMN public.tb_sales_order_dt.order_qty IS '수주수량';
COMMENT ON COLUMN public.tb_sales_order_dt.unit_price IS '수주단가';
COMMENT ON COLUMN public.tb_sales_order_dt.supply_amt IS '공급가액';
COMMENT ON COLUMN public.tb_sales_order_dt.vat_amt IS '부가세액';
COMMENT ON COLUMN public.tb_sales_order_dt.total_amt IS '라인 합계금액(공급가액+부가세)';
COMMENT ON COLUMN public.tb_sales_order_dt.delivery_dt IS '라인 납기일자';
COMMENT ON COLUMN public.tb_sales_order_dt.shipped_qty IS '출하완료수량';
COMMENT ON COLUMN public.tb_sales_order_dt.line_status IS '라인상태';

COMMIT;
