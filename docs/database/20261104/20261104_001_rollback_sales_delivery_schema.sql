-- Maintenance only. Back up first and deploy the previous application version.
-- Refuse rollback if any delivery history exists: shipped quantities need reconciliation.
BEGIN;

DO $delivery_rollback$
BEGIN
    IF EXISTS (SELECT 1 FROM public.tb_sales_delivery_hd)
        OR EXISTS (SELECT 1 FROM public.tb_sales_delivery_dt) THEN
        RAISE EXCEPTION 'Delivery history exists. Reconcile shipped quantities and archive history before schema rollback.';
    END IF;
END;
$delivery_rollback$;

DROP TABLE public.tb_sales_delivery_dt;
DROP TABLE public.tb_sales_delivery_hd;
ALTER TABLE public.tb_sales_order_dt DROP CONSTRAINT uq_sales_order_dt_delivery_reference;

-- Delete generator state only if deliberately resetting the entire feature;
-- this script preserves tb_id_sequence so issued numbers are never reused.
COMMIT;
