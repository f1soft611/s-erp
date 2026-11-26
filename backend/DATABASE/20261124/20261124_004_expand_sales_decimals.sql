BEGIN;

LOCK TABLE public.tb_sales_order_hd, public.tb_sales_order_dt,
    public.tb_sales_quotation_hd, public.tb_sales_quotation_dt,
    public.tb_sales_delivery_hd, public.tb_sales_delivery_dt,
    public.tb_sales_delivery_plan_dt, public.tb_sales_statement_hd,
    public.tb_sales_statement_dt IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
    target RECORD;
    actual_precision INTEGER;
    actual_scale INTEGER;
BEGIN
    FOR target IN
        SELECT * FROM (VALUES
            ('tb_sales_order_hd', 'total_amt'),
            ('tb_sales_order_dt', 'order_qty'), ('tb_sales_order_dt', 'unit_price'),
            ('tb_sales_order_dt', 'supply_amt'), ('tb_sales_order_dt', 'vat_amt'),
            ('tb_sales_order_dt', 'total_amt'), ('tb_sales_order_dt', 'shipped_qty'),
            ('tb_sales_quotation_hd', 'supply_amt'), ('tb_sales_quotation_hd', 'vat_amt'),
            ('tb_sales_quotation_hd', 'total_amt'),
            ('tb_sales_quotation_dt', 'quotation_qty'), ('tb_sales_quotation_dt', 'unit_price'),
            ('tb_sales_quotation_dt', 'line_amt'),
            ('tb_sales_delivery_hd', 'total_amt'),
            ('tb_sales_delivery_dt', 'delivery_qty'), ('tb_sales_delivery_dt', 'unit_price'),
            ('tb_sales_delivery_dt', 'supply_amt'), ('tb_sales_delivery_dt', 'vat_amt'),
            ('tb_sales_delivery_dt', 'total_amt'),
            ('tb_sales_delivery_plan_dt', 'planned_qty'), ('tb_sales_delivery_plan_dt', 'delivered_qty'),
            ('tb_sales_statement_hd', 'total_amt'),
            ('tb_sales_statement_dt', 'delivery_qty'), ('tb_sales_statement_dt', 'unit_price'),
            ('tb_sales_statement_dt', 'supply_amt'), ('tb_sales_statement_dt', 'vat_amt'),
            ('tb_sales_statement_dt', 'total_amt')
        ) AS columns_to_expand(table_name, column_name)
    LOOP
        SELECT numeric_precision, numeric_scale INTO actual_precision, actual_scale
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = target.table_name
          AND column_name = target.column_name AND data_type = 'numeric';
        IF actual_precision IS DISTINCT FROM 15 OR actual_scale IS DISTINCT FROM 2 THEN
            RAISE EXCEPTION 'Unexpected type for %.%; expected numeric(15,2)', target.table_name, target.column_name;
        END IF;
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE numeric(19,6)',
                       target.table_name, target.column_name);
    END LOOP;
END $$;

COMMIT;
