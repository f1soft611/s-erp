-- ONLY before business adoption. String references are checked, but do not use
-- rollback after values have been used or administrators have edited the codes.
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
LOCK TABLE public.tb_tenant, public.tb_common_code_group,
    public.tb_common_code_item, public.tb_sales_order_hd, public.tb_sales_order_dt
    IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.tb_tenant t
        JOIN sales_order_code_context c USING (tenant_id)
    ) THEN
        RAISE EXCEPTION 'Target tenant does not exist';
    END IF;
END;
$$;
DELETE FROM public.tb_common_code_item i
USING public.tb_common_code_group g, sales_order_code_context c,
    sales_order_code_seed s
WHERE i.group_id = g.common_code_group_id
  AND i.tenant_id = c.tenant_id
  AND g.tenant_id = c.tenant_id
  AND g.group_code = s.group_code
  AND i.item_code = s.item_code
  AND i.item_dc = 'sales-order-code-seed:20261117-015'
  AND i.item_nm = s.item_nm
  AND i.sort_order = s.item_sort
  AND i.use_at = 'Y'
  AND i.parent_item_id IS NULL
  AND i.updated_at IS NULL
  AND i.created_by IS NULL
  AND i.updated_by IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM public.tb_common_code_item child
      WHERE child.parent_item_id = i.common_code_item_id
  )
  AND NOT EXISTS (
      SELECT 1
      FROM public.tb_sales_order_hd h
      WHERE h.tenant_id = c.tenant_id
        AND (
            (g.group_code = 'SALES_ORDER_STATUS' AND h.status = i.item_code)
            OR (g.group_code = 'SALES_DELIVERY_METHOD' AND h.delivery_method = i.item_code)
        )
  )
  AND NOT EXISTS (
      SELECT 1
      FROM public.tb_sales_order_dt d
      WHERE g.group_code = 'SALES_ORDER_STATUS'
        AND d.tenant_id = c.tenant_id
        AND d.line_status = i.item_code
  );
DELETE FROM public.tb_common_code_group g
USING sales_order_code_context c,
    (SELECT DISTINCT group_code, group_nm, group_sort FROM sales_order_code_seed) s
WHERE g.tenant_id = c.tenant_id
  AND g.group_code = s.group_code
  AND g.group_dc = 'sales-order-code-seed:20261117-015'
  AND g.group_nm = s.group_nm
  AND g.sort_order = s.group_sort
  AND g.use_at = 'Y'
  AND g.parent_group_id IS NULL
  AND g.updated_at IS NULL
  AND g.created_by IS NULL
  AND g.updated_by IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM public.tb_common_code_item i
      WHERE i.group_id = g.common_code_group_id
  )
  AND NOT EXISTS (
      SELECT 1
      FROM public.tb_common_code_group child
      WHERE child.parent_group_id = g.common_code_group_id
  );
COMMIT;
