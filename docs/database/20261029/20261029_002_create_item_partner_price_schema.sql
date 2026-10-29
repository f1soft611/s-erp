-- Central S-ERP schema draft; this script has not been applied.
-- Preconditions: public.tb_tenant, public.tb_material_info, and
-- public.tb_customer_info exist with their tenant-aware unique keys.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.tb_item_partner_price') IS NOT NULL THEN
        RAISE EXCEPTION
            'tb_item_partner_price already exists; inspect the schema before retrying.';
    END IF;
END;
$$;

CREATE TABLE public.tb_item_partner_price (
    price_id BIGSERIAL NOT NULL,
    tenant_id BIGINT NOT NULL,
    material_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    trade_type VARCHAR(10) NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'KRW',
    start_dt DATE NOT NULL,
    end_dt DATE,
    moq NUMERIC(15,2),
    use_at CHAR(1) NOT NULL DEFAULT 'Y',
    created_by VARCHAR(10),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(10),
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT pk_tb_item_partner_price PRIMARY KEY (price_id),
    CONSTRAINT uq_tb_item_partner_price_id_tenant
        UNIQUE (price_id, tenant_id),
    CONSTRAINT uq_tb_item_partner_price_business_key
        UNIQUE (tenant_id, material_id, customer_id, trade_type, start_dt),
    CONSTRAINT fk_tb_item_partner_price_tenant FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id),
    CONSTRAINT fk_tb_item_partner_price_material FOREIGN KEY (material_id, tenant_id)
        REFERENCES public.tb_material_info (material_id, tenant_id),
    CONSTRAINT fk_tb_item_partner_price_customer FOREIGN KEY (customer_id, tenant_id)
        REFERENCES public.tb_customer_info (customer_id, tenant_id),
    CONSTRAINT ck_tb_item_partner_price_trade_type
        CHECK (trade_type IN ('매입', '매출')),
    CONSTRAINT ck_tb_item_partner_price_unit_price CHECK (unit_price >= 0),
    CONSTRAINT ck_tb_item_partner_price_moq CHECK (moq IS NULL OR moq >= 0),
    CONSTRAINT ck_tb_item_partner_price_use_at CHECK (use_at IN ('Y', 'N')),
    CONSTRAINT ck_tb_item_partner_price_date_range
        CHECK (end_dt IS NULL OR end_dt >= start_dt)
);

CREATE INDEX ix_tb_item_partner_price_tenant_material
    ON public.tb_item_partner_price (tenant_id, material_id);
CREATE INDEX ix_tb_item_partner_price_tenant_customer
    ON public.tb_item_partner_price (tenant_id, customer_id);
CREATE INDEX ix_tb_item_partner_price_tenant_trade_dates
    ON public.tb_item_partner_price (tenant_id, trade_type, start_dt, end_dt);

COMMENT ON TABLE public.tb_item_partner_price IS '테넌트별 품목·거래처 단가';
COMMENT ON COLUMN public.tb_item_partner_price.price_id IS '단가 내부 ID(PK)';
COMMENT ON COLUMN public.tb_item_partner_price.tenant_id IS '소속 테넌트 ID(FK)';
COMMENT ON COLUMN public.tb_item_partner_price.material_id IS '품목 내부 ID(FK)';
COMMENT ON COLUMN public.tb_item_partner_price.customer_id IS '거래처 내부 ID(FK)';
COMMENT ON COLUMN public.tb_item_partner_price.trade_type IS '거래구분(매입/매출)';
COMMENT ON COLUMN public.tb_item_partner_price.unit_price IS '단가';
COMMENT ON COLUMN public.tb_item_partner_price.currency IS '통화 코드(기본 KRW)';
COMMENT ON COLUMN public.tb_item_partner_price.start_dt IS '단가 적용 시작일';
COMMENT ON COLUMN public.tb_item_partner_price.end_dt IS '단가 적용 종료일(NULL이면 종료일 없음)';
COMMENT ON COLUMN public.tb_item_partner_price.moq IS '최소주문수량';
COMMENT ON COLUMN public.tb_item_partner_price.use_at IS '사용여부(Y/N)';
COMMENT ON COLUMN public.tb_item_partner_price.created_by IS '등록자 ID';
COMMENT ON COLUMN public.tb_item_partner_price.created_at IS '등록일시';
COMMENT ON COLUMN public.tb_item_partner_price.updated_by IS '수정자 ID';
COMMENT ON COLUMN public.tb_item_partner_price.updated_at IS '수정일시';

COMMIT;
