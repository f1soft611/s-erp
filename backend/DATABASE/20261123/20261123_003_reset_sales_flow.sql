-- Explicitly select one tenant. Review counts and back up before committing.
-- This transaction defaults to ROLLBACK and never resets document sequences.
BEGIN;

SET LOCAL s_erp.reset_sales_flow_tenant_id = 'REPLACE_WITH_TENANT_ID';

LOCK TABLE public.tb_purchase_request_dt,
    public.tb_sales_statement_dt, public.tb_sales_statement_hd,
    public.tb_sales_delivery_dt, public.tb_sales_delivery_hd,
    public.tb_sales_delivery_plan_dt, public.tb_sales_delivery_plan_hd,
    public.tb_sales_order_dt, public.tb_sales_order_hd
    IN SHARE ROW EXCLUSIVE MODE;

DO $reset_sales_flow$
DECLARE
    v_tenant_id BIGINT;
BEGIN
    BEGIN
        v_tenant_id := NULLIF(current_setting('s_erp.reset_sales_flow_tenant_id', TRUE), '')::BIGINT;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
        RAISE EXCEPTION 'Set a valid positive tenant ID before executing.';
    END;
    IF v_tenant_id IS NULL OR v_tenant_id <= 0 THEN
        RAISE EXCEPTION 'A positive tenant ID is required.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.tb_tenant WHERE tenant_id = v_tenant_id) THEN
        RAISE EXCEPTION 'The specified tenant does not exist.';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM public.tb_purchase_request_dt p
        WHERE EXISTS (
            SELECT 1 FROM public.tb_sales_order_hd h
            WHERE h.tenant_id = v_tenant_id AND h.sales_order_id = p.sales_order_id
        ) OR EXISTS (
            SELECT 1 FROM public.tb_sales_order_dt d
            WHERE d.tenant_id = v_tenant_id AND d.sales_order_detail_id = p.sales_order_detail_id
        )
    ) THEN
        RAISE EXCEPTION 'Purchase requests reference target orders; resolve separately before resetting.';
    END IF;

    RAISE NOTICE 'Target counts: statement details %, statement headers %, delivery details %, delivery headers %, plan details %, plan headers %, order details %, order headers %',
        (SELECT COUNT(*) FROM public.tb_sales_statement_dt WHERE tenant_id = v_tenant_id),
        (SELECT COUNT(*) FROM public.tb_sales_statement_hd WHERE tenant_id = v_tenant_id),
        (SELECT COUNT(*) FROM public.tb_sales_delivery_dt WHERE tenant_id = v_tenant_id),
        (SELECT COUNT(*) FROM public.tb_sales_delivery_hd WHERE tenant_id = v_tenant_id),
        (SELECT COUNT(*) FROM public.tb_sales_delivery_plan_dt WHERE tenant_id = v_tenant_id),
        (SELECT COUNT(*) FROM public.tb_sales_delivery_plan_hd WHERE tenant_id = v_tenant_id),
        (SELECT COUNT(*) FROM public.tb_sales_order_dt WHERE tenant_id = v_tenant_id),
        (SELECT COUNT(*) FROM public.tb_sales_order_hd WHERE tenant_id = v_tenant_id);

    DELETE FROM public.tb_sales_statement_dt WHERE tenant_id = v_tenant_id;
    DELETE FROM public.tb_sales_statement_hd WHERE tenant_id = v_tenant_id;
    -- Revenue closing state belongs to delivery detail rows.
    DELETE FROM public.tb_sales_delivery_dt WHERE tenant_id = v_tenant_id;
    DELETE FROM public.tb_sales_delivery_hd WHERE tenant_id = v_tenant_id;
    DELETE FROM public.tb_sales_delivery_plan_dt WHERE tenant_id = v_tenant_id;
    DELETE FROM public.tb_sales_delivery_plan_hd WHERE tenant_id = v_tenant_id;
    DELETE FROM public.tb_sales_order_dt WHERE tenant_id = v_tenant_id;
    DELETE FROM public.tb_sales_order_hd WHERE tenant_id = v_tenant_id;
END;
$reset_sales_flow$;

-- Only an authorized operator may change this to COMMIT after reviewing counts.
ROLLBACK;
