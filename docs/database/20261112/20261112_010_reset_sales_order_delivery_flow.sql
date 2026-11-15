-- Tenant-scoped reset for the sales order -> delivery flow.
-- Set the tenant ID below, review the NOTICE counts, and keep ROLLBACK unless
-- an authorized operator has confirmed a backup and intends to apply the reset.
BEGIN;

SET LOCAL s_erp.reset_sales_flow_tenant_id = 'REPLACE_WITH_TENANT_ID';

DO $reset_sales_flow$
DECLARE
    v_tenant_id BIGINT;
    v_order_count BIGINT;
    v_order_detail_count BIGINT;
    v_plan_count BIGINT;
    v_plan_detail_count BIGINT;
    v_delivery_count BIGINT;
    v_delivery_detail_count BIGINT;
    v_statement_count BIGINT;
    v_statement_detail_count BIGINT;
    v_purchase_request_count BIGINT;
    v_purchase_request_detail_count BIGINT;
    v_purchase_confirm_count BIGINT;
    v_deleted_count BIGINT;
BEGIN
    BEGIN
        v_tenant_id := NULLIF(
            current_setting('s_erp.reset_sales_flow_tenant_id', TRUE),
            ''
        )::BIGINT;
    EXCEPTION
        WHEN invalid_text_representation THEN
            RAISE EXCEPTION 'Set s_erp.reset_sales_flow_tenant_id to a numeric tenant_id before running this script.';
    END;

    IF v_tenant_id IS NULL OR v_tenant_id <= 0 THEN
        RAISE EXCEPTION 'A positive tenant_id is required; no data was deleted.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.tb_tenant t
        WHERE t.tenant_id = v_tenant_id
    ) THEN
        RAISE EXCEPTION 'tenant_id % does not exist; no data was deleted.', v_tenant_id;
    END IF;

    CREATE TEMP TABLE reset_sales_flow_orders ON COMMIT DROP AS
    SELECT h.tenant_id, h.sales_order_id
    FROM public.tb_sales_order_hd h
    WHERE h.tenant_id = v_tenant_id;

    CREATE TEMP TABLE reset_sales_flow_order_details ON COMMIT DROP AS
    SELECT d.tenant_id, d.sales_order_id, d.sales_order_detail_id
    FROM public.tb_sales_order_dt d
    JOIN reset_sales_flow_orders o
      ON o.tenant_id = d.tenant_id
     AND o.sales_order_id = d.sales_order_id;

    CREATE TEMP TABLE reset_sales_flow_plans ON COMMIT DROP AS
    SELECT h.tenant_id, h.sales_delivery_plan_id
    FROM public.tb_sales_delivery_plan_hd h
    WHERE h.tenant_id = v_tenant_id;

    CREATE TEMP TABLE reset_sales_flow_plan_details ON COMMIT DROP AS
    SELECT d.tenant_id, d.sales_delivery_plan_detail_id
    FROM public.tb_sales_delivery_plan_dt d
    JOIN reset_sales_flow_plans p
      ON p.tenant_id = d.tenant_id
     AND p.sales_delivery_plan_id = d.sales_delivery_plan_id;

    CREATE TEMP TABLE reset_sales_flow_deliveries ON COMMIT DROP AS
    SELECT h.tenant_id, h.sales_delivery_id
    FROM public.tb_sales_delivery_hd h
    WHERE h.tenant_id = v_tenant_id;

    CREATE TEMP TABLE reset_sales_flow_delivery_details ON COMMIT DROP AS
    SELECT d.tenant_id, d.sales_delivery_detail_id
    FROM public.tb_sales_delivery_dt d
    JOIN reset_sales_flow_deliveries h
      ON h.tenant_id = d.tenant_id
     AND h.sales_delivery_id = d.sales_delivery_id;

    CREATE TEMP TABLE reset_sales_flow_statements ON COMMIT DROP AS
    SELECT h.tenant_id, h.sales_statement_id
    FROM public.tb_sales_statement_hd h
    JOIN reset_sales_flow_deliveries d
      ON d.tenant_id = h.tenant_id
     AND d.sales_delivery_id = h.sales_delivery_id;

    CREATE TEMP TABLE reset_sales_flow_statement_details ON COMMIT DROP AS
    SELECT d.tenant_id, d.sales_statement_detail_id
    FROM public.tb_sales_statement_dt d
    JOIN reset_sales_flow_statements h
      ON h.tenant_id = d.tenant_id
     AND h.sales_statement_id = d.sales_statement_id;

    CREATE TEMP TABLE reset_sales_flow_purchase_requests ON COMMIT DROP AS
    SELECT DISTINCT h.tenant_id, h.purchase_request_id
    FROM public.tb_purchase_request_hd h
    JOIN public.tb_purchase_request_dt d
      ON d.tenant_id = h.tenant_id
     AND d.purchase_request_id = h.purchase_request_id
    WHERE h.tenant_id = v_tenant_id
      AND (
          EXISTS (
              SELECT 1
              FROM reset_sales_flow_orders o
              WHERE o.tenant_id = d.tenant_id
                AND o.sales_order_id = d.sales_order_id
          )
          OR EXISTS (
              SELECT 1
              FROM reset_sales_flow_order_details od
              WHERE od.tenant_id = d.tenant_id
                AND od.sales_order_detail_id = d.sales_order_detail_id
          )
      );

    CREATE TEMP TABLE reset_sales_flow_purchase_request_details ON COMMIT DROP AS
    SELECT d.tenant_id, d.purchase_request_detail_id, d.purchase_confirm_id
    FROM public.tb_purchase_request_dt d
    JOIN reset_sales_flow_purchase_requests h
      ON h.tenant_id = d.tenant_id
     AND h.purchase_request_id = d.purchase_request_id;

    CREATE TEMP TABLE reset_sales_flow_purchase_confirms ON COMMIT DROP AS
    SELECT DISTINCT d.tenant_id, d.purchase_confirm_id
    FROM reset_sales_flow_purchase_request_details d
    WHERE d.purchase_confirm_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1
          FROM public.tb_purchase_request_dt remaining
          WHERE remaining.tenant_id = d.tenant_id
            AND remaining.purchase_confirm_id = d.purchase_confirm_id
            AND NOT EXISTS (
                SELECT 1
                FROM reset_sales_flow_purchase_requests target_request
                WHERE target_request.tenant_id = remaining.tenant_id
                  AND target_request.purchase_request_id = remaining.purchase_request_id
            )
      );

    SELECT
        (SELECT COUNT(*) FROM reset_sales_flow_orders),
        (SELECT COUNT(*) FROM reset_sales_flow_order_details),
        (SELECT COUNT(*) FROM reset_sales_flow_plans),
        (SELECT COUNT(*) FROM reset_sales_flow_plan_details),
        (SELECT COUNT(*) FROM reset_sales_flow_deliveries),
        (SELECT COUNT(*) FROM reset_sales_flow_delivery_details),
        (SELECT COUNT(*) FROM reset_sales_flow_statements),
        (SELECT COUNT(*) FROM reset_sales_flow_statement_details),
        (SELECT COUNT(*) FROM reset_sales_flow_purchase_requests),
        (SELECT COUNT(*) FROM reset_sales_flow_purchase_request_details),
        (SELECT COUNT(*) FROM reset_sales_flow_purchase_confirms)
    INTO
        v_order_count,
        v_order_detail_count,
        v_plan_count,
        v_plan_detail_count,
        v_delivery_count,
        v_delivery_detail_count,
        v_statement_count,
        v_statement_detail_count,
        v_purchase_request_count,
        v_purchase_request_detail_count,
        v_purchase_confirm_count;

    RAISE NOTICE 'Reset preview tenant_id=%: orders %, order details %, plans %, plan details %, deliveries %, delivery details %, statements %, statement details %, purchase requests %, purchase request details %, orphaned purchase confirmations %',
        v_tenant_id,
        v_order_count,
        v_order_detail_count,
        v_plan_count,
        v_plan_detail_count,
        v_delivery_count,
        v_delivery_detail_count,
        v_statement_count,
        v_statement_detail_count,
        v_purchase_request_count,
        v_purchase_request_detail_count,
        v_purchase_confirm_count;

    DELETE FROM public.tb_sales_statement_dt d
    USING reset_sales_flow_statement_details target
    WHERE d.tenant_id = v_tenant_id
      AND d.tenant_id = target.tenant_id
      AND d.sales_statement_detail_id = target.sales_statement_detail_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count <> v_statement_detail_count THEN
        RAISE EXCEPTION 'Statement detail count changed during reset; transaction aborted.';
    END IF;

    DELETE FROM public.tb_sales_statement_hd h
    USING reset_sales_flow_statements target
    WHERE h.tenant_id = v_tenant_id
      AND h.tenant_id = target.tenant_id
      AND h.sales_statement_id = target.sales_statement_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count <> v_statement_count THEN
        RAISE EXCEPTION 'Statement header count changed during reset; transaction aborted.';
    END IF;

    DELETE FROM public.tb_sales_delivery_dt d
    USING reset_sales_flow_delivery_details target
    WHERE d.tenant_id = v_tenant_id
      AND d.tenant_id = target.tenant_id
      AND d.sales_delivery_detail_id = target.sales_delivery_detail_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count <> v_delivery_detail_count THEN
        RAISE EXCEPTION 'Delivery detail count changed during reset; transaction aborted.';
    END IF;

    DELETE FROM public.tb_sales_delivery_hd h
    USING reset_sales_flow_deliveries target
    WHERE h.tenant_id = v_tenant_id
      AND h.tenant_id = target.tenant_id
      AND h.sales_delivery_id = target.sales_delivery_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count <> v_delivery_count THEN
        RAISE EXCEPTION 'Delivery header count changed during reset; transaction aborted.';
    END IF;

    DELETE FROM public.tb_sales_delivery_plan_dt d
    USING reset_sales_flow_plan_details target
    WHERE d.tenant_id = v_tenant_id
      AND d.tenant_id = target.tenant_id
      AND d.sales_delivery_plan_detail_id = target.sales_delivery_plan_detail_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count <> v_plan_detail_count THEN
        RAISE EXCEPTION 'Delivery plan detail count changed during reset; transaction aborted.';
    END IF;

    DELETE FROM public.tb_sales_delivery_plan_hd h
    USING reset_sales_flow_plans target
    WHERE h.tenant_id = v_tenant_id
      AND h.tenant_id = target.tenant_id
      AND h.sales_delivery_plan_id = target.sales_delivery_plan_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count <> v_plan_count THEN
        RAISE EXCEPTION 'Delivery plan header count changed during reset; transaction aborted.';
    END IF;

    DELETE FROM public.tb_purchase_request_hd h
    USING reset_sales_flow_purchase_requests target
    WHERE h.tenant_id = v_tenant_id
      AND h.tenant_id = target.tenant_id
      AND h.purchase_request_id = target.purchase_request_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count <> v_purchase_request_count THEN
        RAISE EXCEPTION 'Purchase request count changed during reset; transaction aborted.';
    END IF;

    DELETE FROM public.tb_purchase_confirm_hd h
    USING reset_sales_flow_purchase_confirms target
    WHERE h.tenant_id = v_tenant_id
      AND h.tenant_id = target.tenant_id
      AND h.purchase_confirm_id = target.purchase_confirm_id
      AND NOT EXISTS (
          SELECT 1
          FROM public.tb_purchase_request_dt remaining
          WHERE remaining.tenant_id = v_tenant_id
            AND remaining.purchase_confirm_id = h.purchase_confirm_id
      );
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count <> v_purchase_confirm_count THEN
        RAISE EXCEPTION 'Purchase confirmation count changed during reset; transaction aborted.';
    END IF;

    DELETE FROM public.tb_sales_order_hd h
    USING reset_sales_flow_orders target
    WHERE h.tenant_id = v_tenant_id
      AND h.tenant_id = target.tenant_id
      AND h.sales_order_id = target.sales_order_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    IF v_deleted_count <> v_order_count THEN
        RAISE EXCEPTION 'Sales order count changed during reset; transaction aborted.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.tb_sales_order_hd
        WHERE tenant_id = v_tenant_id
    ) OR EXISTS (
        SELECT 1
        FROM public.tb_sales_delivery_plan_hd
        WHERE tenant_id = v_tenant_id
    ) OR EXISTS (
        SELECT 1
        FROM public.tb_sales_delivery_hd
        WHERE tenant_id = v_tenant_id
    ) OR EXISTS (
        SELECT 1
        FROM public.tb_sales_statement_hd
        WHERE tenant_id = v_tenant_id
          AND sales_delivery_id IN (
              SELECT sales_delivery_id
              FROM reset_sales_flow_deliveries
          )
    ) THEN
        RAISE EXCEPTION 'Target flow rows remain after reset; transaction aborted.';
    END IF;
END;
$reset_sales_flow$;

-- Review the NOTICE counts. Replace with COMMIT only after approval and backup.
ROLLBACK;
