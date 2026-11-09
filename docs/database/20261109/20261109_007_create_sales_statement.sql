-- Apply after 20261109_006_company_info.sql. Does not run automatically.
BEGIN;

CREATE TABLE public.tb_sales_statement_hd (
    sales_statement_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    sales_delivery_id BIGINT NOT NULL,
    statement_no VARCHAR(30) NOT NULL,
    statement_dt DATE NOT NULL,
    delivery_no VARCHAR(30) NOT NULL,
    delivery_dt DATE NOT NULL,
    delivery_type VARCHAR(10) NOT NULL,
    order_no VARCHAR(30),
    supplier_name VARCHAR(200) NOT NULL,
    supplier_business_no VARCHAR(20),
    supplier_president_name VARCHAR(100),
    supplier_business_type VARCHAR(200),
    supplier_business_category VARCHAR(200),
    supplier_post_code VARCHAR(20),
    supplier_address VARCHAR(500),
    supplier_telephone_no VARCHAR(50),
    supplier_facsimile_no VARCHAR(50),
    customer_code VARCHAR(50),
    customer_name VARCHAR(200),
    customer_business_no VARCHAR(20),
    customer_president_name VARCHAR(100),
    customer_business_type VARCHAR(200),
    customer_business_category VARCHAR(200),
    customer_post_code VARCHAR(20),
    customer_address VARCHAR(500),
    customer_telephone_no VARCHAR(50),
    customer_facsimile_no VARCHAR(50),
    total_amt NUMERIC(15,2) NOT NULL,
    remark VARCHAR(500),
    use_at CHAR(1) NOT NULL DEFAULT 'Y' CHECK (use_at IN ('Y', 'N')),
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP,
    CONSTRAINT uq_sales_statement_tenant UNIQUE (sales_statement_id, tenant_id),
    CONSTRAINT uq_sales_statement_no UNIQUE (tenant_id, statement_no),
    CONSTRAINT fk_sales_statement_delivery FOREIGN KEY (sales_delivery_id, tenant_id)
        REFERENCES public.tb_sales_delivery_hd (sales_delivery_id, tenant_id)
);

CREATE UNIQUE INDEX uq_sales_statement_active_delivery
    ON public.tb_sales_statement_hd (tenant_id, sales_delivery_id) WHERE use_at = 'Y';
CREATE INDEX ix_sales_statement_date ON public.tb_sales_statement_hd (tenant_id, statement_dt);

CREATE TABLE public.tb_sales_statement_dt (
    sales_statement_detail_id BIGSERIAL PRIMARY KEY,
    sales_statement_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    line_no INTEGER NOT NULL CHECK (line_no > 0),
    material_code VARCHAR(100),
    material_name VARCHAR(300),
    material_spec VARCHAR(500),
    unit VARCHAR(50),
    delivery_qty NUMERIC(15,2) NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    supply_amt NUMERIC(15,2) NOT NULL,
    vat_amt NUMERIC(15,2) NOT NULL,
    total_amt NUMERIC(15,2) NOT NULL,
    CONSTRAINT uq_sales_statement_line UNIQUE (sales_statement_id, line_no),
    CONSTRAINT fk_sales_statement_detail_header FOREIGN KEY (sales_statement_id, tenant_id)
        REFERENCES public.tb_sales_statement_hd (sales_statement_id, tenant_id)
);
COMMIT;
