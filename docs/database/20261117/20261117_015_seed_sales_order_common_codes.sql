-- psql -X -v ON_ERROR_STOP=1 -v target_tenant_id=<approved-id> -f <this-file>
-- Adds only missing sales-order code groups/items and never updates managed values.
\set ON_ERROR_STOP on
\encoding UTF8
BEGIN;
CREATE TEMP TABLE sales_order_code_context ON COMMIT DROP AS
SELECT :'target_tenant_id'::bigint AS tenant_id;
CREATE TEMP TABLE sales_order_code_seed (
    group_code varchar(50),
    group_nm varchar(200),
    group_sort integer,
    item_code varchar(50),
    item_nm varchar(200),
    item_sort integer
) ON COMMIT DROP;
INSERT INTO sales_order_code_seed VALUES
    ('SALES_ORDER_STATUS', '수주 진행상태', 260, '수주등록', '수주 등록', 10),
    ('SALES_ORDER_STATUS', '수주 진행상태', 260, '생산대기', '생산 대기', 20),
    ('SALES_ORDER_STATUS', '수주 진행상태', 260, '생산중', '생산 중', 30),
    ('SALES_ORDER_STATUS', '수주 진행상태', 260, '출하완료', '출하 완료', 40),
    ('SALES_ORDER_STATUS', '수주 진행상태', 260, '취소', '취소', 50),
    ('SALES_ORDER_STATUS', '수주 진행상태', 260, '대기', '대기', 60),
    ('SALES_DELIVERY_METHOD', '배송방법', 270, '택배', '택배', 10);
LOCK TABLE public.tb_common_code_group, public.tb_common_code_item IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.tb_tenant t
        JOIN sales_order_code_context c USING (tenant_id)
    ) THEN
        RAISE EXCEPTION 'Target tenant does not exist';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM public.tb_common_code_group g
        JOIN sales_order_code_context c USING (tenant_id)
        WHERE g.group_code IN (
            SELECT DISTINCT group_code FROM sales_order_code_seed
        )
          AND (g.parent_group_id IS NOT NULL OR g.use_at <> 'Y')
    ) THEN
        RAISE EXCEPTION 'Existing target group must be active and have no parent';
    END IF;
END;
$$;
INSERT INTO public.tb_common_code_group (
    tenant_id, group_code, group_nm, group_dc, sort_order, use_at
)
SELECT DISTINCT c.tenant_id, s.group_code, s.group_nm,
    'sales-order-code-seed:20261117-015', s.group_sort, 'Y'
FROM sales_order_code_context c
CROSS JOIN sales_order_code_seed s
ON CONFLICT (tenant_id, group_code) DO NOTHING;
INSERT INTO public.tb_common_code_item (
    tenant_id, group_id, item_code, item_nm, item_dc, sort_order, use_at
)
SELECT c.tenant_id, g.common_code_group_id, s.item_code, s.item_nm,
    'sales-order-code-seed:20261117-015', s.item_sort, 'Y'
FROM sales_order_code_context c
JOIN public.tb_common_code_group g ON g.tenant_id = c.tenant_id
JOIN sales_order_code_seed s ON s.group_code = g.group_code
ON CONFLICT (group_id, item_code) DO NOTHING;
COMMIT;
