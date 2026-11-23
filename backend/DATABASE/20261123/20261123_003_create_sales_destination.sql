-- Existing orders are not migrated. Required fields are enforced by the API.
BEGIN;

CREATE TABLE public.tb_sales_destination (
    sales_destination_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    destination_code VARCHAR(30) NOT NULL,
    destination_name VARCHAR(200) NOT NULL,
    business_no VARCHAR(40),
    address VARCHAR(500),
    contact_name VARCHAR(100),
    mobile_no VARCHAR(40),
    telephone_no VARCHAR(40),
    facsimile_no VARCHAR(40),
    remark VARCHAR(1000),
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT uq_sales_destination_tenant_code UNIQUE (tenant_id, destination_code),
    CONSTRAINT uq_sales_destination_id_customer_tenant UNIQUE (sales_destination_id, customer_id, tenant_id),
    CONSTRAINT fk_sales_destination_customer FOREIGN KEY (customer_id, tenant_id)
        REFERENCES public.tb_customer_info (customer_id, tenant_id)
);

CREATE INDEX idx_sales_destination_customer ON public.tb_sales_destination (tenant_id, customer_id);

ALTER TABLE public.tb_sales_order_hd
    ADD COLUMN sales_destination_id BIGINT,
    ADD COLUMN billing_customer_id BIGINT,
    ADD CONSTRAINT fk_sales_order_destination
        FOREIGN KEY (sales_destination_id, customer_id, tenant_id)
        REFERENCES public.tb_sales_destination (sales_destination_id, customer_id, tenant_id),
    ADD CONSTRAINT fk_sales_order_billing_customer
        FOREIGN KEY (billing_customer_id, tenant_id)
        REFERENCES public.tb_customer_info (customer_id, tenant_id);

COMMIT;
