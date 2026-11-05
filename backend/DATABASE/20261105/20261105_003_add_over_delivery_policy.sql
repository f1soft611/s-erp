-- Apply after 20261105_002_add_sales_delivery_planning.sql. No live execution.
BEGIN;

ALTER TABLE public.tb_tenant
    ADD COLUMN over_delivery_policy VARCHAR(10) NOT NULL DEFAULT 'BLOCK',
    ADD CONSTRAINT ck_tenant_over_delivery_policy
        CHECK (over_delivery_policy IN ('BLOCK', 'WARN'));

ALTER TABLE public.tb_sales_delivery_plan_dt
    DROP CONSTRAINT ck_sales_delivery_plan_dt_delivered,
    ADD CONSTRAINT ck_sales_delivery_plan_dt_delivered CHECK (
        delivered_qty >= 0 AND delivered_qty <> 'NaN'::numeric
    );

-- NUMERIC(15,2) bounds the finite value; preserve nullable legacy shipped counters.
ALTER TABLE public.tb_sales_order_dt
    ADD CONSTRAINT ck_sales_order_dt_shipped_nonnegative CHECK (
        shipped_qty IS NULL OR (shipped_qty >= 0 AND shipped_qty <> 'NaN'::numeric)
    );

COMMENT ON COLUMN public.tb_tenant.over_delivery_policy IS
    '초과납품 정책: BLOCK 차단(기본), WARN 사용자 경고 확인 후 허용';
COMMENT ON COLUMN public.tb_sales_delivery_plan_dt.delivered_qty IS
    '실제 누적납품수량. WARN 정책에서는 계획수량 초과 가능, 기준수량은 유지';

COMMIT;
