-- Central S-ERP database migration draft; not applied.
-- Preconditions: public.tb_tenant, public.tb_material_info, and
-- public.tb_customer_info exist with the tenant-aware unique keys checked below.
-- This migration refuses nonblank business_kind1/2 data and never drops existing tables.

BEGIN;

LOCK TABLE public.tb_material_info, public.tb_customer_info
    IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
    business_kind1_type TEXT;
    business_kind2_type TEXT;
    business_kind1_nullable TEXT;
    business_kind2_nullable TEXT;
    business_kind1_default TEXT;
    business_kind2_default TEXT;
BEGIN
    IF to_regclass('public.tb_cls_item') IS NOT NULL
       OR to_regclass('public.tb_cls_partner') IS NOT NULL THEN
        RAISE EXCEPTION
            'Classification migration requires tb_cls_item and tb_cls_partner to be absent.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.tb_tenant'::regclass
          AND contype IN ('p', 'u')
          AND conkey = ARRAY[
              (SELECT attnum FROM pg_attribute
               WHERE attrelid = 'public.tb_tenant'::regclass
                 AND attname = 'tenant_id' AND NOT attisdropped)
          ]::smallint[]
    ) THEN
        RAISE EXCEPTION 'tb_tenant.tenant_id must be a primary or unique key.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.tb_material_info'::regclass
          AND contype IN ('p', 'u')
          AND conkey = ARRAY[
              (SELECT attnum FROM pg_attribute
               WHERE attrelid = 'public.tb_material_info'::regclass
                 AND attname = 'material_id' AND NOT attisdropped),
              (SELECT attnum FROM pg_attribute
               WHERE attrelid = 'public.tb_material_info'::regclass
                 AND attname = 'tenant_id' AND NOT attisdropped)
          ]::smallint[]
    ) THEN
        RAISE EXCEPTION
            'tb_material_info requires a unique key on (material_id, tenant_id).';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.tb_customer_info'::regclass
          AND contype IN ('p', 'u')
          AND conkey = ARRAY[
              (SELECT attnum FROM pg_attribute
               WHERE attrelid = 'public.tb_customer_info'::regclass
                 AND attname = 'customer_id' AND NOT attisdropped),
              (SELECT attnum FROM pg_attribute
               WHERE attrelid = 'public.tb_customer_info'::regclass
                 AND attname = 'tenant_id' AND NOT attisdropped)
          ]::smallint[]
    ) THEN
        RAISE EXCEPTION
            'tb_customer_info requires a unique key on (customer_id, tenant_id).';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'tb_material_info'
          AND column_name = 'item_cls_id'
    ) THEN
        RAISE EXCEPTION
            'tb_material_info.item_cls_id already exists; inspect the schema before retrying.';
    END IF;

    SELECT data_type INTO business_kind1_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tb_customer_info'
      AND column_name = 'business_kind1';
    SELECT is_nullable, column_default
    INTO business_kind1_nullable, business_kind1_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tb_customer_info'
      AND column_name = 'business_kind1';

    SELECT data_type INTO business_kind2_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tb_customer_info'
      AND column_name = 'business_kind2';
    SELECT is_nullable, column_default
    INTO business_kind2_nullable, business_kind2_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tb_customer_info'
      AND column_name = 'business_kind2';

    IF business_kind1_type IS DISTINCT FROM 'character varying'
       OR business_kind2_type IS DISTINCT FROM 'character varying'
       OR business_kind1_nullable IS DISTINCT FROM 'YES'
       OR business_kind2_nullable IS DISTINCT FROM 'YES'
       OR business_kind1_default IS NOT NULL
       OR business_kind2_default IS NOT NULL THEN
        RAISE EXCEPTION
            'tb_customer_info.business_kind1/2 must be nullable character varying columns without defaults.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.tb_customer_info
        WHERE NULLIF(btrim(business_kind1), '') IS NOT NULL
           OR NULLIF(btrim(business_kind2), '') IS NOT NULL
    ) THEN
        RAISE EXCEPTION
            'Refusing classification migration: business_kind1/2 contain nonblank values.';
    END IF;
END;
$$;

CREATE TABLE public.tb_cls_item (
    item_cls_id BIGSERIAL NOT NULL,
    tenant_id BIGINT NOT NULL,
    item_cls_nm VARCHAR(50) NOT NULL,
    item_cls_lvl SMALLINT NOT NULL,
    upper_item_cls_id BIGINT,
    sort_seq INT NOT NULL DEFAULT 0,
    use_at CHAR(1) NOT NULL DEFAULT 'Y',
    created_by VARCHAR(10),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(10),
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT pk_tb_cls_item PRIMARY KEY (item_cls_id),
    CONSTRAINT uq_tb_cls_item_id_tenant UNIQUE (item_cls_id, tenant_id),
    CONSTRAINT fk_tb_cls_item_tenant FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id),
    CONSTRAINT fk_tb_cls_item_upper FOREIGN KEY (upper_item_cls_id, tenant_id)
        REFERENCES public.tb_cls_item (item_cls_id, tenant_id),
    CONSTRAINT ck_tb_cls_item_level CHECK (item_cls_lvl IN (1, 2, 3)),
    CONSTRAINT ck_tb_cls_item_parent CHECK (
        (item_cls_lvl = 1 AND upper_item_cls_id IS NULL)
        OR (item_cls_lvl IN (2, 3) AND upper_item_cls_id IS NOT NULL)
    ),
    CONSTRAINT ck_tb_cls_item_use_at CHECK (use_at IN ('Y', 'N'))
);

CREATE TABLE public.tb_cls_partner (
    partner_cls_id BIGSERIAL NOT NULL,
    tenant_id BIGINT NOT NULL,
    partner_cls_nm VARCHAR(50) NOT NULL,
    partner_cls_lvl SMALLINT NOT NULL,
    upper_partner_cls_id BIGINT,
    sort_seq INT NOT NULL DEFAULT 0,
    use_at CHAR(1) NOT NULL DEFAULT 'Y',
    created_by VARCHAR(10),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(10),
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT pk_tb_cls_partner PRIMARY KEY (partner_cls_id),
    CONSTRAINT uq_tb_cls_partner_id_tenant UNIQUE (partner_cls_id, tenant_id),
    CONSTRAINT uq_tb_cls_partner_id_upper_tenant
        UNIQUE (partner_cls_id, upper_partner_cls_id, tenant_id),
    CONSTRAINT fk_tb_cls_partner_tenant FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id),
    CONSTRAINT fk_tb_cls_partner_upper FOREIGN KEY (upper_partner_cls_id, tenant_id)
        REFERENCES public.tb_cls_partner (partner_cls_id, tenant_id),
    CONSTRAINT ck_tb_cls_partner_level CHECK (partner_cls_lvl IN (1, 2)),
    CONSTRAINT ck_tb_cls_partner_parent CHECK (
        (partner_cls_lvl = 1 AND upper_partner_cls_id IS NULL)
        OR (partner_cls_lvl = 2 AND upper_partner_cls_id IS NOT NULL)
    ),
    CONSTRAINT ck_tb_cls_partner_use_at CHECK (use_at IN ('Y', 'N'))
);

CREATE INDEX ix_tb_cls_item_tenant_parent_sort
    ON public.tb_cls_item (tenant_id, upper_item_cls_id, sort_seq, item_cls_id);
CREATE INDEX ix_tb_cls_partner_tenant_parent_sort
    ON public.tb_cls_partner (tenant_id, upper_partner_cls_id, sort_seq, partner_cls_id);

ALTER TABLE public.tb_material_info
    ADD COLUMN item_cls_id BIGINT;

ALTER TABLE public.tb_material_info
    ADD CONSTRAINT fk_tb_material_info_item_cls
    FOREIGN KEY (item_cls_id, tenant_id)
    REFERENCES public.tb_cls_item (item_cls_id, tenant_id);

CREATE INDEX ix_tb_material_info_tenant_item_cls
    ON public.tb_material_info (tenant_id, item_cls_id);

ALTER TABLE public.tb_customer_info
    ALTER COLUMN business_kind1 TYPE BIGINT
        USING NULLIF(btrim(business_kind1), '')::BIGINT,
    ALTER COLUMN business_kind2 TYPE BIGINT
        USING NULLIF(btrim(business_kind2), '')::BIGINT;

ALTER TABLE public.tb_customer_info
    ADD CONSTRAINT ck_tb_customer_info_business_kind_pair
        CHECK (business_kind2 IS NULL OR business_kind1 IS NOT NULL),
    ADD CONSTRAINT fk_tb_customer_info_business_kind1
        FOREIGN KEY (business_kind1, tenant_id)
        REFERENCES public.tb_cls_partner (partner_cls_id, tenant_id),
    ADD CONSTRAINT fk_tb_customer_info_business_kind2_parent
        FOREIGN KEY (business_kind2, business_kind1, tenant_id)
        REFERENCES public.tb_cls_partner
            (partner_cls_id, upper_partner_cls_id, tenant_id);

CREATE INDEX ix_tb_customer_info_tenant_business_kind1
    ON public.tb_customer_info (tenant_id, business_kind1);
CREATE INDEX ix_tb_customer_info_tenant_business_kind2
    ON public.tb_customer_info (tenant_id, business_kind2);

COMMENT ON TABLE public.tb_cls_item IS '품목분류마스터(테넌트별 대/중/소 계층)';
COMMENT ON COLUMN public.tb_cls_item.item_cls_id IS '품목분류 내부 ID(PK)';
COMMENT ON COLUMN public.tb_cls_item.tenant_id IS '소속 테넌트 ID(FK)';
COMMENT ON COLUMN public.tb_cls_item.item_cls_nm IS '품목분류명';
COMMENT ON COLUMN public.tb_cls_item.item_cls_lvl IS '분류레벨(1:대, 2:중, 3:소)';
COMMENT ON COLUMN public.tb_cls_item.upper_item_cls_id IS '상위 품목분류 내부 ID';
COMMENT ON COLUMN public.tb_cls_item.sort_seq IS '동일 계층 내 정렬순서';
COMMENT ON COLUMN public.tb_cls_item.use_at IS '사용여부(Y/N)';
COMMENT ON COLUMN public.tb_cls_item.created_by IS '등록자 ID';
COMMENT ON COLUMN public.tb_cls_item.created_at IS '등록일시';
COMMENT ON COLUMN public.tb_cls_item.updated_by IS '수정자 ID';
COMMENT ON COLUMN public.tb_cls_item.updated_at IS '수정일시';

COMMENT ON TABLE public.tb_cls_partner IS '거래처분류마스터(테넌트별 대/소 계층)';
COMMENT ON COLUMN public.tb_cls_partner.partner_cls_id IS '거래처분류 내부 ID(PK)';
COMMENT ON COLUMN public.tb_cls_partner.tenant_id IS '소속 테넌트 ID(FK)';
COMMENT ON COLUMN public.tb_cls_partner.partner_cls_nm IS '거래처분류명';
COMMENT ON COLUMN public.tb_cls_partner.partner_cls_lvl IS '분류레벨(1:대, 2:소)';
COMMENT ON COLUMN public.tb_cls_partner.upper_partner_cls_id IS '상위 거래처분류 내부 ID';
COMMENT ON COLUMN public.tb_cls_partner.sort_seq IS '동일 계층 내 정렬순서';
COMMENT ON COLUMN public.tb_cls_partner.use_at IS '사용여부(Y/N)';
COMMENT ON COLUMN public.tb_cls_partner.created_by IS '등록자 ID';
COMMENT ON COLUMN public.tb_cls_partner.created_at IS '등록일시';
COMMENT ON COLUMN public.tb_cls_partner.updated_by IS '수정자 ID';
COMMENT ON COLUMN public.tb_cls_partner.updated_at IS '수정일시';

COMMENT ON COLUMN public.tb_material_info.item_cls_id IS '품목 소분류 내부 ID(FK)';
COMMENT ON COLUMN public.tb_customer_info.business_kind1 IS '거래처 대분류 내부 ID(FK)';
COMMENT ON COLUMN public.tb_customer_info.business_kind2 IS '거래처 소분류 내부 ID(FK; business_kind1의 하위)';

COMMIT;
