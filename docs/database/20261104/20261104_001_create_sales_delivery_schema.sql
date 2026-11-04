-- Apply once to each approved application database after the sales order schema.
-- No business data or menu changes. Not applied automatically.
BEGIN;

ALTER TABLE public.tb_sales_order_dt
    ADD CONSTRAINT uq_sales_order_dt_delivery_reference
    UNIQUE (sales_order_detail_id, sales_order_id, tenant_id, material_id);

CREATE TABLE public.tb_sales_delivery_hd (
    sales_delivery_id BIGSERIAL NOT NULL,
    tenant_id BIGINT NOT NULL,
    delivery_no VARCHAR(30) NOT NULL,
    delivery_dt DATE NOT NULL,
    delivery_type VARCHAR(10) NOT NULL,
    customer_id BIGINT NOT NULL,
    sales_order_id BIGINT,
    delivery_place VARCHAR(200),
    delivery_method VARCHAR(50),
    total_amt NUMERIC(15,2) NOT NULL DEFAULT 0,
    remark VARCHAR(500),
    use_at CHAR(1) NOT NULL DEFAULT 'Y',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT pk_sales_delivery_hd PRIMARY KEY (sales_delivery_id),
    CONSTRAINT uq_sales_delivery_hd_no UNIQUE (tenant_id, delivery_no),
    CONSTRAINT uq_sales_delivery_hd_tenant UNIQUE (sales_delivery_id, tenant_id),
    CONSTRAINT uq_sales_delivery_hd_type UNIQUE (sales_delivery_id, tenant_id, delivery_type),
    CONSTRAINT uq_sales_delivery_hd_order UNIQUE (sales_delivery_id, tenant_id, sales_order_id),
    CONSTRAINT fk_sales_delivery_hd_tenant FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id),
    CONSTRAINT fk_sales_delivery_hd_customer FOREIGN KEY (customer_id, tenant_id)
        REFERENCES public.tb_customer_info (customer_id, tenant_id),
    CONSTRAINT fk_sales_delivery_hd_order FOREIGN KEY (sales_order_id, tenant_id)
        REFERENCES public.tb_sales_order_hd (sales_order_id, tenant_id),
    CONSTRAINT ck_sales_delivery_hd_source CHECK (
        (delivery_type = 'DIRECT' AND sales_order_id IS NULL)
        OR (delivery_type = 'ORDER' AND sales_order_id IS NOT NULL)
    ),
    CONSTRAINT ck_sales_delivery_hd_total CHECK (total_amt >= 0 AND total_amt <> 'NaN'::numeric),
    CONSTRAINT ck_sales_delivery_hd_use CHECK (use_at IN ('Y', 'N'))
);

CREATE TABLE public.tb_sales_delivery_dt (
    sales_delivery_detail_id BIGSERIAL NOT NULL,
    sales_delivery_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    delivery_type VARCHAR(10) NOT NULL,
    line_no INTEGER NOT NULL,
    material_id BIGINT NOT NULL,
    sales_order_id BIGINT,
    sales_order_detail_id BIGINT,
    delivery_qty NUMERIC(15,2) NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    supply_amt NUMERIC(15,2) NOT NULL,
    vat_amt NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_amt NUMERIC(15,2) NOT NULL,
    CONSTRAINT pk_sales_delivery_dt PRIMARY KEY (sales_delivery_detail_id),
    CONSTRAINT uq_sales_delivery_dt_line UNIQUE (sales_delivery_id, line_no),
    CONSTRAINT uq_sales_delivery_dt_source UNIQUE (sales_delivery_id, sales_order_detail_id),
    CONSTRAINT fk_sales_delivery_dt_hd_type FOREIGN KEY (sales_delivery_id, tenant_id, delivery_type)
        REFERENCES public.tb_sales_delivery_hd (sales_delivery_id, tenant_id, delivery_type),
    CONSTRAINT fk_sales_delivery_dt_hd_order FOREIGN KEY (sales_delivery_id, tenant_id, sales_order_id)
        REFERENCES public.tb_sales_delivery_hd (sales_delivery_id, tenant_id, sales_order_id),
    CONSTRAINT fk_sales_delivery_dt_material FOREIGN KEY (material_id, tenant_id)
        REFERENCES public.tb_material_info (material_id, tenant_id),
    CONSTRAINT fk_sales_delivery_dt_source FOREIGN KEY (
        sales_order_detail_id, sales_order_id, tenant_id, material_id
    ) REFERENCES public.tb_sales_order_dt (
        sales_order_detail_id, sales_order_id, tenant_id, material_id
    ),
    CONSTRAINT ck_sales_delivery_dt_source CHECK (
        (delivery_type = 'DIRECT' AND sales_order_id IS NULL AND sales_order_detail_id IS NULL)
        OR (delivery_type = 'ORDER' AND sales_order_id IS NOT NULL AND sales_order_detail_id IS NOT NULL)
    ),
    CONSTRAINT ck_sales_delivery_dt_line CHECK (line_no > 0),
    CONSTRAINT ck_sales_delivery_dt_qty CHECK (delivery_qty > 0 AND delivery_qty <> 'NaN'::numeric),
    CONSTRAINT ck_sales_delivery_dt_amounts CHECK (
        unit_price >= 0 AND unit_price <> 'NaN'::numeric
        AND supply_amt >= 0 AND supply_amt <> 'NaN'::numeric
        AND vat_amt >= 0 AND vat_amt <> 'NaN'::numeric
        AND total_amt = supply_amt + vat_amt
    )
);

CREATE INDEX ix_sales_delivery_hd_date ON public.tb_sales_delivery_hd (tenant_id, delivery_dt);
CREATE INDEX ix_sales_delivery_hd_customer ON public.tb_sales_delivery_hd (tenant_id, customer_id);
CREATE INDEX ix_sales_delivery_hd_order ON public.tb_sales_delivery_hd (tenant_id, sales_order_id)
    WHERE sales_order_id IS NOT NULL;
CREATE INDEX ix_sales_delivery_dt_material ON public.tb_sales_delivery_dt (tenant_id, material_id);
CREATE INDEX ix_sales_delivery_dt_order ON public.tb_sales_delivery_dt (tenant_id, sales_order_id, sales_order_detail_id)
    WHERE sales_order_id IS NOT NULL;

COMMENT ON TABLE public.tb_sales_delivery_hd IS '납품등록 헤더(수주납품/직납품)';
COMMENT ON COLUMN public.tb_sales_delivery_hd.sales_delivery_id IS '납품 내부 식별자(PK)';
COMMENT ON COLUMN public.tb_sales_delivery_hd.tenant_id IS '테넌트 ID';
COMMENT ON COLUMN public.tb_sales_delivery_hd.delivery_no IS '테넌트별 유일 납품번호';
COMMENT ON COLUMN public.tb_sales_delivery_hd.delivery_dt IS '납품일자';
COMMENT ON COLUMN public.tb_sales_delivery_hd.delivery_type IS '납품구분(ORDER 수주납품, DIRECT 직납품)';
COMMENT ON COLUMN public.tb_sales_delivery_hd.customer_id IS '거래처 ID(테넌트 복합 FK)';
COMMENT ON COLUMN public.tb_sales_delivery_hd.sales_order_id IS '연결 수주 ID(직납품은 NULL)';
COMMENT ON COLUMN public.tb_sales_delivery_hd.delivery_place IS '납품장소';
COMMENT ON COLUMN public.tb_sales_delivery_hd.delivery_method IS '배송방법';
COMMENT ON COLUMN public.tb_sales_delivery_hd.total_amt IS '납품 상세 합계금액 합산';
COMMENT ON COLUMN public.tb_sales_delivery_hd.remark IS '비고';
COMMENT ON COLUMN public.tb_sales_delivery_hd.use_at IS '사용여부(Y/N), 삭제는 N';
COMMENT ON COLUMN public.tb_sales_delivery_hd.created_by IS '등록자 로그인 코드';
COMMENT ON COLUMN public.tb_sales_delivery_hd.created_at IS '등록일시';
COMMENT ON COLUMN public.tb_sales_delivery_hd.updated_by IS '수정자 로그인 코드';
COMMENT ON COLUMN public.tb_sales_delivery_hd.updated_at IS '수정일시';
COMMENT ON TABLE public.tb_sales_delivery_dt IS '납품등록 상세(품목별)';
COMMENT ON COLUMN public.tb_sales_delivery_dt.sales_delivery_detail_id IS '납품 상세 식별자(PK)';
COMMENT ON COLUMN public.tb_sales_delivery_dt.sales_delivery_id IS '납품 ID';
COMMENT ON COLUMN public.tb_sales_delivery_dt.tenant_id IS '테넌트 ID(헤더/품목/수주 복합 FK)';
COMMENT ON COLUMN public.tb_sales_delivery_dt.delivery_type IS '헤더와 동일한 납품구분(복합 FK)';
COMMENT ON COLUMN public.tb_sales_delivery_dt.line_no IS '납품서 내 상세 순번';
COMMENT ON COLUMN public.tb_sales_delivery_dt.material_id IS '품목 ID';
COMMENT ON COLUMN public.tb_sales_delivery_dt.sales_order_id IS '연결 수주 ID(직납품은 NULL)';
COMMENT ON COLUMN public.tb_sales_delivery_dt.sales_order_detail_id IS '연결 수주 상세 ID(직납품은 NULL)';
COMMENT ON COLUMN public.tb_sales_delivery_dt.delivery_qty IS '납품수량(양수, 연결 수주 출하수량 반영)';
COMMENT ON COLUMN public.tb_sales_delivery_dt.unit_price IS '납품단가';
COMMENT ON COLUMN public.tb_sales_delivery_dt.supply_amt IS '공급가액(수량 곱하기 단가, 소수 둘째 자리 반올림)';
COMMENT ON COLUMN public.tb_sales_delivery_dt.vat_amt IS '부가세액';
COMMENT ON COLUMN public.tb_sales_delivery_dt.total_amt IS '공급가액과 부가세액 합계';

COMMIT;
