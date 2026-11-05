-- Apply once after 20261104_001_create_sales_delivery_schema.sql.
-- Backfills existing order/delivery records but does not apply itself automatically.
BEGIN;

DO $planning_preflight$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.tb_sales_order_dt
        WHERE COALESCE(shipped_qty, 0) < 0
           OR COALESCE(shipped_qty, 0) > order_qty
    ) THEN
        RAISE EXCEPTION 'Existing shipped quantities are inconsistent with order quantities; reconcile before migration.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.tb_sales_delivery_dt d
        WHERE d.sales_order_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM public.tb_sales_order_dt od
              WHERE od.sales_order_detail_id = d.sales_order_detail_id
                AND od.sales_order_id = d.sales_order_id
                AND od.tenant_id = d.tenant_id
                AND od.material_id = d.material_id
          )
    ) THEN
        RAISE EXCEPTION 'Existing delivery rows do not match an order detail; reconcile before migration.';
    END IF;
END;
$planning_preflight$;

ALTER TABLE public.tb_tenant
    ADD COLUMN delivery_plan_mode VARCHAR(10) NOT NULL DEFAULT 'AUTO',
    ADD CONSTRAINT ck_tenant_delivery_plan_mode
        CHECK (delivery_plan_mode IN ('AUTO', 'MANUAL'));

CREATE TABLE public.tb_sales_delivery_plan_hd (
    sales_delivery_plan_id BIGSERIAL NOT NULL,
    tenant_id BIGINT NOT NULL,
    sales_order_id BIGINT NOT NULL,
    plan_no VARCHAR(30) NOT NULL,
    use_at CHAR(1) NOT NULL DEFAULT 'Y',
    created_by VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT pk_sales_delivery_plan_hd PRIMARY KEY (sales_delivery_plan_id),
    CONSTRAINT uq_sales_delivery_plan_hd_no UNIQUE (tenant_id, plan_no),
    CONSTRAINT uq_sales_delivery_plan_hd_order UNIQUE (sales_order_id, tenant_id),
    CONSTRAINT uq_sales_delivery_plan_hd_reference
        UNIQUE (sales_delivery_plan_id, tenant_id, sales_order_id),
    CONSTRAINT fk_sales_delivery_plan_hd_tenant FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id),
    CONSTRAINT fk_sales_delivery_plan_hd_order FOREIGN KEY (sales_order_id, tenant_id)
        REFERENCES public.tb_sales_order_hd (sales_order_id, tenant_id),
    CONSTRAINT ck_sales_delivery_plan_hd_use CHECK (use_at IN ('Y', 'N'))
);

CREATE TABLE public.tb_sales_delivery_plan_dt (
    sales_delivery_plan_detail_id BIGSERIAL NOT NULL,
    sales_delivery_plan_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    sales_order_id BIGINT NOT NULL,
    sales_order_detail_id BIGINT NOT NULL,
    material_id BIGINT NOT NULL,
    line_no INTEGER NOT NULL,
    plan_dt DATE,
    planned_qty NUMERIC(15,2) NOT NULL,
    delivered_qty NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT pk_sales_delivery_plan_dt PRIMARY KEY (sales_delivery_plan_detail_id),
    CONSTRAINT uq_sales_delivery_plan_dt_line UNIQUE (sales_delivery_plan_id, line_no),
    CONSTRAINT uq_sales_delivery_plan_dt_reference UNIQUE (
        sales_delivery_plan_detail_id, tenant_id, sales_order_id, sales_order_detail_id
    ),
    CONSTRAINT fk_sales_delivery_plan_dt_hd FOREIGN KEY (
        sales_delivery_plan_id, tenant_id, sales_order_id
    ) REFERENCES public.tb_sales_delivery_plan_hd (
        sales_delivery_plan_id, tenant_id, sales_order_id
    ),
    CONSTRAINT fk_sales_delivery_plan_dt_order_line FOREIGN KEY (
        sales_order_detail_id, sales_order_id, tenant_id, material_id
    ) REFERENCES public.tb_sales_order_dt (
        sales_order_detail_id, sales_order_id, tenant_id, material_id
    ),
    CONSTRAINT ck_sales_delivery_plan_dt_line CHECK (line_no > 0),
    CONSTRAINT ck_sales_delivery_plan_dt_planned CHECK (
        planned_qty > 0 AND planned_qty <> 'NaN'::numeric
    ),
    CONSTRAINT ck_sales_delivery_plan_dt_delivered CHECK (
        delivered_qty >= 0 AND delivered_qty <> 'NaN'::numeric
        AND delivered_qty <= planned_qty
    )
);

CREATE INDEX ix_sales_delivery_plan_hd_tenant_order
    ON public.tb_sales_delivery_plan_hd (tenant_id, sales_order_id);
CREATE INDEX ix_sales_delivery_plan_dt_order_line
    ON public.tb_sales_delivery_plan_dt (tenant_id, sales_order_id, sales_order_detail_id);
CREATE INDEX ix_sales_delivery_plan_dt_date
    ON public.tb_sales_delivery_plan_dt (tenant_id, plan_dt);

INSERT INTO public.tb_sales_delivery_plan_hd (
    tenant_id, sales_order_id, plan_no, created_by, created_at
)
SELECT h.tenant_id, h.sales_order_id, 'DP-MIG-' || h.sales_order_id::text,
       h.created_by, h.created_at
FROM public.tb_sales_order_hd h;

INSERT INTO public.tb_sales_delivery_plan_dt (
    sales_delivery_plan_id, tenant_id, sales_order_id, sales_order_detail_id,
    material_id, line_no, plan_dt, planned_qty, delivered_qty, created_by, created_at
)
SELECT ph.sales_delivery_plan_id, d.tenant_id, d.sales_order_id,
       d.sales_order_detail_id, d.material_id,
       ROW_NUMBER() OVER (PARTITION BY d.sales_order_id ORDER BY d.line_no)::integer,
       COALESCE(d.delivery_dt, h.delivery_dt), d.order_qty,
       COALESCE(d.shipped_qty, 0), h.created_by, h.created_at
FROM public.tb_sales_order_dt d
JOIN public.tb_sales_order_hd h
  ON h.sales_order_id = d.sales_order_id
 AND h.tenant_id = d.tenant_id
JOIN public.tb_sales_delivery_plan_hd ph
  ON ph.sales_order_id = h.sales_order_id
 AND ph.tenant_id = h.tenant_id;

ALTER TABLE public.tb_sales_delivery_dt
    ADD COLUMN sales_delivery_plan_detail_id BIGINT;

UPDATE public.tb_sales_delivery_dt d
SET sales_delivery_plan_detail_id = pd.sales_delivery_plan_detail_id
FROM public.tb_sales_delivery_plan_dt pd
WHERE d.sales_order_id = pd.sales_order_id
  AND d.sales_order_detail_id = pd.sales_order_detail_id
  AND d.tenant_id = pd.tenant_id;

DO $delivery_plan_link_check$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.tb_sales_delivery_dt
        WHERE sales_order_id IS NOT NULL
          AND sales_delivery_plan_detail_id IS NULL
    ) THEN
        RAISE EXCEPTION 'Existing order delivery rows could not be linked to a plan detail.';
    END IF;
END;
$delivery_plan_link_check$;

ALTER TABLE public.tb_sales_delivery_dt
    DROP CONSTRAINT uq_sales_delivery_dt_source,
    DROP CONSTRAINT ck_sales_delivery_dt_source,
    ADD CONSTRAINT uq_sales_delivery_dt_plan_source
        UNIQUE (sales_delivery_id, sales_delivery_plan_detail_id),
    ADD CONSTRAINT fk_sales_delivery_dt_plan_source FOREIGN KEY (
        sales_delivery_plan_detail_id, tenant_id, sales_order_id, sales_order_detail_id
    ) REFERENCES public.tb_sales_delivery_plan_dt (
        sales_delivery_plan_detail_id, tenant_id, sales_order_id, sales_order_detail_id
    ),
    ADD CONSTRAINT ck_sales_delivery_dt_source CHECK (
        (delivery_type = 'DIRECT'
            AND sales_order_id IS NULL
            AND sales_order_detail_id IS NULL
            AND sales_delivery_plan_detail_id IS NULL)
        OR
        (delivery_type = 'ORDER'
            AND sales_order_id IS NOT NULL
            AND sales_order_detail_id IS NOT NULL
            AND sales_delivery_plan_detail_id IS NOT NULL)
    );

CREATE INDEX ix_sales_delivery_dt_plan
    ON public.tb_sales_delivery_dt (tenant_id, sales_delivery_plan_detail_id)
    WHERE sales_delivery_plan_detail_id IS NOT NULL;

COMMENT ON COLUMN public.tb_tenant.delivery_plan_mode IS
    '납품계획 운영모드(AUTO 자동생성, MANUAL 수동관리)';
COMMENT ON TABLE public.tb_sales_delivery_plan_hd IS
    '수주별 납품계획 헤더(수주당 하나)';
COMMENT ON COLUMN public.tb_sales_delivery_plan_hd.sales_delivery_plan_id IS
    '납품계획 내부 식별자(PK)';
COMMENT ON COLUMN public.tb_sales_delivery_plan_hd.tenant_id IS
    '테넌트 ID';
COMMENT ON COLUMN public.tb_sales_delivery_plan_hd.sales_order_id IS
    '계획 대상 수주 ID(테넌트 복합 FK)';
COMMENT ON COLUMN public.tb_sales_delivery_plan_hd.plan_no IS
    '테넌트별 유일 납품계획번호';
COMMENT ON COLUMN public.tb_sales_delivery_plan_hd.use_at IS
    '사용 여부(Y/N)';
COMMENT ON COLUMN public.tb_sales_delivery_plan_hd.created_by IS
    '등록자 로그인 코드';
COMMENT ON COLUMN public.tb_sales_delivery_plan_hd.created_at IS
    '등록 일시';
COMMENT ON COLUMN public.tb_sales_delivery_plan_hd.updated_by IS
    '수정자 로그인 코드';
COMMENT ON COLUMN public.tb_sales_delivery_plan_hd.updated_at IS
    '수정 일시';
COMMENT ON TABLE public.tb_sales_delivery_plan_dt IS
    '수주상세별 납품예정일/계획수량(분할계획 가능)';
COMMENT ON COLUMN public.tb_sales_delivery_plan_dt.sales_delivery_plan_detail_id IS
    '납품계획 상세 식별자(PK)';
COMMENT ON COLUMN public.tb_sales_delivery_plan_dt.sales_delivery_plan_id IS
    '납품계획 헤더 ID';
COMMENT ON COLUMN public.tb_sales_delivery_plan_dt.tenant_id IS
    '테넌트 ID';
COMMENT ON COLUMN public.tb_sales_delivery_plan_dt.sales_order_id IS
    '원 수주 ID';
COMMENT ON COLUMN public.tb_sales_delivery_plan_dt.sales_order_detail_id IS
    '원 수주상세 ID';
COMMENT ON COLUMN public.tb_sales_delivery_plan_dt.material_id IS
    '수주상세의 품목 ID';
COMMENT ON COLUMN public.tb_sales_delivery_plan_dt.line_no IS
    '계획상세 순번';
COMMENT ON COLUMN public.tb_sales_delivery_plan_dt.plan_dt IS
    '납품 예정일(NULL은 미정)';
COMMENT ON COLUMN public.tb_sales_delivery_plan_dt.planned_qty IS
    '계획 수량';
COMMENT ON COLUMN public.tb_sales_delivery_plan_dt.delivered_qty IS
    '실제 납품 등록 수량 누계';
COMMENT ON COLUMN public.tb_sales_delivery_plan_dt.created_by IS
    '등록자 로그인 코드';
COMMENT ON COLUMN public.tb_sales_delivery_plan_dt.created_at IS
    '등록 일시';
COMMENT ON COLUMN public.tb_sales_delivery_plan_dt.updated_by IS
    '수정자 로그인 코드';
COMMENT ON COLUMN public.tb_sales_delivery_plan_dt.updated_at IS
    '수정 일시';
COMMENT ON COLUMN public.tb_sales_delivery_dt.sales_delivery_plan_detail_id IS
    '연결 납품계획 상세 ID(ORDER 필수, DIRECT NULL)';

COMMIT;
