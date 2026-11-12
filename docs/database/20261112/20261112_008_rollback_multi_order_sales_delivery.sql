BEGIN;

LOCK TABLE public.tb_sales_delivery_hd IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.tb_sales_delivery_dt IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.tb_sales_delivery_dt d
        JOIN public.tb_sales_delivery_hd h
          ON h.sales_delivery_id = d.sales_delivery_id
         AND h.tenant_id = d.tenant_id
        WHERE d.sales_order_id IS DISTINCT FROM h.sales_order_id
    ) THEN
        RAISE EXCEPTION
            'Cannot restore fk_sales_delivery_dt_hd_order: multi-order delivery details exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.tb_sales_delivery_dt'::regclass
          AND conname = 'fk_sales_delivery_dt_hd_order'
    ) THEN
        ALTER TABLE public.tb_sales_delivery_dt
            ADD CONSTRAINT fk_sales_delivery_dt_hd_order
            FOREIGN KEY (sales_delivery_id, tenant_id, sales_order_id)
            REFERENCES public.tb_sales_delivery_hd
                (sales_delivery_id, tenant_id, sales_order_id);
    END IF;
END
$$;

COMMIT;
