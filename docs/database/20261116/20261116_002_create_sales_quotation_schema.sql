-- New environment only. Prerequisites: public.tb_tenant,
-- public.tb_customer_info, public.tb_material_info.
-- This script has not been applied to a database.

BEGIN;

CREATE TABLE public.tb_sales_quotation_hd (
    quotation_id BIGSERIAL NOT NULL,
    tenant_id BIGINT NOT NULL,
    quotation_no VARCHAR(30) NOT NULL,
    quotation_dt DATE NOT NULL,
    submit_dt DATE,
    customer_id BIGINT NOT NULL,
    customer_reference VARCHAR(100),
    incoterms VARCHAR(50),
    payment_term VARCHAR(100),
    valid_term VARCHAR(100),
    currency_code VARCHAR(10),
    remark VARCHAR(500),
    supply_amt NUMERIC(15,2) NOT NULL DEFAULT 0,
    vat_amt NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_amt NUMERIC(15,2) NOT NULL DEFAULT 0,
    use_at CHAR(1) NOT NULL DEFAULT 'Y',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT pk_sales_quotation_hd PRIMARY KEY (quotation_id),
    CONSTRAINT uq_sales_quotation_hd_tenant_no UNIQUE (tenant_id, quotation_no),
    CONSTRAINT uq_sales_quotation_hd_id_tenant UNIQUE (quotation_id, tenant_id),
    CONSTRAINT fk_sales_quotation_hd_tenant FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id),
    CONSTRAINT fk_sales_quotation_hd_customer FOREIGN KEY (customer_id, tenant_id)
        REFERENCES public.tb_customer_info (customer_id, tenant_id),
    CONSTRAINT ck_sales_quotation_hd_use_at CHECK (use_at IN ('Y', 'N'))
);

CREATE TABLE public.tb_sales_quotation_dt (
    quotation_detail_id BIGSERIAL NOT NULL,
    quotation_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    line_no INTEGER NOT NULL,
    material_id BIGINT,
    material_code VARCHAR(20),
    material_name VARCHAR(200) NOT NULL,
    material_spec VARCHAR(100),
    unit VARCHAR(6),
    quotation_qty NUMERIC(15,2) NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    line_amt NUMERIC(15,2) NOT NULL,
    remark VARCHAR(500),
    CONSTRAINT pk_sales_quotation_dt PRIMARY KEY (quotation_detail_id),
    CONSTRAINT uq_sales_quotation_dt_quotation_line UNIQUE (quotation_id, line_no),
    CONSTRAINT fk_sales_quotation_dt_hd FOREIGN KEY (quotation_id, tenant_id)
        REFERENCES public.tb_sales_quotation_hd (quotation_id, tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_quotation_dt_material FOREIGN KEY (material_id, tenant_id)
        REFERENCES public.tb_material_info (material_id, tenant_id),
    CONSTRAINT ck_sales_quotation_dt_line_no CHECK (line_no > 0),
    CONSTRAINT ck_sales_quotation_dt_qty CHECK (quotation_qty > 0),
    CONSTRAINT ck_sales_quotation_dt_unit_price CHECK (unit_price >= 0),
    CONSTRAINT ck_sales_quotation_dt_line_amt CHECK (line_amt >= 0)
);

CREATE INDEX ix_sales_quotation_hd_tenant_dt
    ON public.tb_sales_quotation_hd USING btree (tenant_id, quotation_dt);
CREATE INDEX ix_sales_quotation_hd_tenant_customer
    ON public.tb_sales_quotation_hd USING btree (tenant_id, customer_id);
CREATE INDEX ix_sales_quotation_dt_material_id
    ON public.tb_sales_quotation_dt USING btree (material_id);

COMMENT ON TABLE public.tb_sales_quotation_hd IS '견적서 헤더';
COMMENT ON COLUMN public.tb_sales_quotation_hd.quotation_id IS '견적 내부 식별자(PK)';
COMMENT ON COLUMN public.tb_sales_quotation_hd.tenant_id IS '테넌트 ID(FK)';
COMMENT ON COLUMN public.tb_sales_quotation_hd.quotation_no IS '테넌트별 견적번호';
COMMENT ON COLUMN public.tb_sales_quotation_hd.quotation_dt IS '견적작성일';
COMMENT ON COLUMN public.tb_sales_quotation_hd.submit_dt IS '견적제출일';
COMMENT ON COLUMN public.tb_sales_quotation_hd.customer_id IS '거래처 ID(FK)';
COMMENT ON COLUMN public.tb_sales_quotation_hd.customer_reference IS '거래처 참조';
COMMENT ON COLUMN public.tb_sales_quotation_hd.incoterms IS '인코텀즈';
COMMENT ON COLUMN public.tb_sales_quotation_hd.payment_term IS '결제조건';
COMMENT ON COLUMN public.tb_sales_quotation_hd.valid_term IS '견적유효기간';
COMMENT ON COLUMN public.tb_sales_quotation_hd.currency_code IS '화폐단위';
COMMENT ON COLUMN public.tb_sales_quotation_hd.remark IS '비고';
COMMENT ON COLUMN public.tb_sales_quotation_hd.supply_amt IS '공급가액 합계';
COMMENT ON COLUMN public.tb_sales_quotation_hd.vat_amt IS '부가세 합계';
COMMENT ON COLUMN public.tb_sales_quotation_hd.total_amt IS '견적 총액';
COMMENT ON COLUMN public.tb_sales_quotation_hd.use_at IS '사용여부(Y/N)';
COMMENT ON COLUMN public.tb_sales_quotation_hd.created_by IS '등록자 로그인 코드';
COMMENT ON COLUMN public.tb_sales_quotation_hd.created_at IS '등록일시';
COMMENT ON COLUMN public.tb_sales_quotation_hd.updated_by IS '수정자 로그인 코드';
COMMENT ON COLUMN public.tb_sales_quotation_hd.updated_at IS '수정일시';

COMMENT ON TABLE public.tb_sales_quotation_dt IS '견적서 상세(품목별)';
COMMENT ON COLUMN public.tb_sales_quotation_dt.quotation_detail_id IS '견적 상세 내부 식별자(PK)';
COMMENT ON COLUMN public.tb_sales_quotation_dt.quotation_id IS '견적 내부 식별자(FK)';
COMMENT ON COLUMN public.tb_sales_quotation_dt.tenant_id IS '테넌트 ID(헤더와 동일 범위)';
COMMENT ON COLUMN public.tb_sales_quotation_dt.line_no IS '견적 라인 번호';
COMMENT ON COLUMN public.tb_sales_quotation_dt.material_id IS '선택한 마스터 품목 ID; 직접 입력 시 NULL';
COMMENT ON COLUMN public.tb_sales_quotation_dt.material_code IS '품목코드 스냅샷';
COMMENT ON COLUMN public.tb_sales_quotation_dt.material_name IS '품목명 스냅샷';
COMMENT ON COLUMN public.tb_sales_quotation_dt.material_spec IS '품목규격 스냅샷';
COMMENT ON COLUMN public.tb_sales_quotation_dt.unit IS '단위 스냅샷';
COMMENT ON COLUMN public.tb_sales_quotation_dt.quotation_qty IS '견적수량';
COMMENT ON COLUMN public.tb_sales_quotation_dt.unit_price IS '견적단가';
COMMENT ON COLUMN public.tb_sales_quotation_dt.line_amt IS '견적 상세 금액';
COMMENT ON COLUMN public.tb_sales_quotation_dt.remark IS '상세 비고';

COMMIT;
