-- Guarded rollback for the unapplied item/partner pricing schema draft.
-- Refuses rollback if price rows exist; no CASCADE is used.

BEGIN;

LOCK TABLE public.tb_item_partner_price IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.tb_item_partner_price LIMIT 1) THEN
        RAISE EXCEPTION
            'Refusing item/partner price rollback: price rows exist.';
    END IF;
END;
$$;

DROP INDEX public.ix_tb_item_partner_price_tenant_material;
DROP INDEX public.ix_tb_item_partner_price_tenant_customer;
DROP INDEX public.ix_tb_item_partner_price_tenant_trade_dates;
DROP TABLE public.tb_item_partner_price;

COMMIT;
