-- New environment only: public.tb_material_info must not already exist.
-- Prerequisite: public.tb_tenant.
-- Next: 20261022_010_material_code_id_generator.sql (requires public.ids).

BEGIN;

CREATE TABLE public.tb_material_info (
    material_id BIGSERIAL NOT NULL,
    tenant_id BIGINT NOT NULL,
    material_code VARCHAR(20) NOT NULL,
    material_name VARCHAR(200) NOT NULL,
    material_eng_name VARCHAR(200),
    material_model_name VARCHAR(200),
    material_spec VARCHAR(100),
    material_weight BIGINT,
    unit VARCHAR(6),
    material_type_code VARCHAR(14) NOT NULL,
    customer_code VARCHAR(10),
    safe_invoice DOUBLE PRECISION,
    accounting_code VARCHAR(7),
    warehouse_code VARCHAR(10),
    drawing VARCHAR(10),
    etc VARCHAR(100),
    part_no VARCHAR(30),
    manufactory VARCHAR(100),
    deleted_at TIMESTAMP WITHOUT TIME ZONE,
    mat_cata_type VARCHAR(10) NOT NULL DEFAULT '',
    location VARCHAR(1000),
    material_spec2 VARCHAR(100),
    item_type VARCHAR(10),
    search_item_name VARCHAR(200),
    material_quality VARCHAR(6),
    item_barcode VARCHAR(20),
    material_no VARCHAR(20),
    delete_status VARCHAR(10) NOT NULL DEFAULT 'N',
    created_by VARCHAR(10),
    created_at TIMESTAMP WITHOUT TIME ZONE,
    updated_by VARCHAR(10),
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    material_kind VARCHAR(50),
    store_method VARCHAR(50),
    expiryed_status VARCHAR(10) NOT NULL DEFAULT 'NONE',
    expiryed_count INTEGER,
    kfda_report_no VARCHAR(20),
    CONSTRAINT tb_material_info_pkey PRIMARY KEY (material_id),
    CONSTRAINT uq_material_id_tenant_id UNIQUE (material_id, tenant_id),
    CONSTRAINT uq_tb_material_info_tenant_material_code UNIQUE (tenant_id, material_code),
    CONSTRAINT fk_tb_material_info_tenant FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id),
    CONSTRAINT ck_tb_material_info_expiryed_status
        CHECK (expiryed_status IN ('NONE', 'DAY', 'MONTH', 'YEAR')),
    CONSTRAINT ck_tb_material_info_expiryed_count
        CHECK (expiryed_count IS NULL OR expiryed_count > 0)
);

CREATE INDEX ix_tb_material_info_material_name ON public.tb_material_info USING btree (material_name);
CREATE INDEX ix_tb_material_info_tenant_id ON public.tb_material_info USING btree (tenant_id);

COMMENT ON TABLE public.tb_material_info IS '품목 정보';
COMMENT ON COLUMN public.tb_material_info.material_code IS '품목코드';
COMMENT ON COLUMN public.tb_material_info.material_name IS '품목명';
COMMENT ON COLUMN public.tb_material_info.material_eng_name IS '품목영문명';
COMMENT ON COLUMN public.tb_material_info.material_model_name IS '품목모델명';
COMMENT ON COLUMN public.tb_material_info.material_spec IS '품목규격';
COMMENT ON COLUMN public.tb_material_info.material_weight IS '중량';
COMMENT ON COLUMN public.tb_material_info.unit IS '단위';
COMMENT ON COLUMN public.tb_material_info.material_type_code IS '품목계정코드';
COMMENT ON COLUMN public.tb_material_info.customer_code IS '제조사';
COMMENT ON COLUMN public.tb_material_info.safe_invoice IS '안전재고';
COMMENT ON COLUMN public.tb_material_info.accounting_code IS '회계코드';
COMMENT ON COLUMN public.tb_material_info.warehouse_code IS '창고코드';
COMMENT ON COLUMN public.tb_material_info.drawing IS '도면번호';
COMMENT ON COLUMN public.tb_material_info.etc IS '비고';
COMMENT ON COLUMN public.tb_material_info.part_no IS 'Part No';
COMMENT ON COLUMN public.tb_material_info.manufactory IS '제조';
COMMENT ON COLUMN public.tb_material_info.deleted_at IS '삭제일자';
COMMENT ON COLUMN public.tb_material_info.mat_cata_type IS '품목분류';
COMMENT ON COLUMN public.tb_material_info.location IS '위치정보';
COMMENT ON COLUMN public.tb_material_info.material_spec2 IS '품목규격2';
COMMENT ON COLUMN public.tb_material_info.item_type IS '품목계정(제품/상품/원재료/부재료/소모품)';
COMMENT ON COLUMN public.tb_material_info.search_item_name IS '통합검색명칭';
COMMENT ON COLUMN public.tb_material_info.material_quality IS '품목재질';
COMMENT ON COLUMN public.tb_material_info.item_barcode IS '품목바코드';
COMMENT ON COLUMN public.tb_material_info.material_no IS '품목번호';
COMMENT ON COLUMN public.tb_material_info.delete_status IS '삭제여부';
COMMENT ON COLUMN public.tb_material_info.created_by IS '등록자';
COMMENT ON COLUMN public.tb_material_info.created_at IS '등록일시';
COMMENT ON COLUMN public.tb_material_info.updated_by IS '수정자';
COMMENT ON COLUMN public.tb_material_info.updated_at IS '수정일시';
COMMENT ON COLUMN public.tb_material_info.material_kind IS '품목유형(공통코드 MATERIAL_TYPE)';
COMMENT ON COLUMN public.tb_material_info.store_method IS '보관방법(공통코드 STORE_METHOD)';
COMMENT ON COLUMN public.tb_material_info.expiryed_status IS '소비기한기준(공통코드 EXPIRY_STATUS: NONE/DAY/MONTH/YEAR)';
COMMENT ON COLUMN public.tb_material_info.expiryed_count IS '소비기한계산숫자';
COMMENT ON COLUMN public.tb_material_info.kfda_report_no IS '품목보고번호';

COMMIT;
