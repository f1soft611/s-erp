-- Guarded rollback for the unapplied classification migration draft.
-- Refuses rollback once classification records or master references exist.

BEGIN;

LOCK TABLE public.tb_material_info, public.tb_customer_info,
    public.tb_cls_item, public.tb_cls_partner
    IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.tb_cls_item LIMIT 1)
       OR EXISTS (SELECT 1 FROM public.tb_cls_partner LIMIT 1)
       OR EXISTS (
           SELECT 1 FROM public.tb_material_info
           WHERE item_cls_id IS NOT NULL LIMIT 1
       )
       OR EXISTS (
           SELECT 1 FROM public.tb_customer_info
           WHERE business_kind1 IS NOT NULL
              OR business_kind2 IS NOT NULL
           LIMIT 1
       ) THEN
        RAISE EXCEPTION
            'Refusing classification rollback: classification rows or master references exist.';
    END IF;
END;
$$;

ALTER TABLE public.tb_customer_info
    DROP CONSTRAINT ck_tb_customer_info_business_kind_pair,
    DROP CONSTRAINT fk_tb_customer_info_business_kind1,
    DROP CONSTRAINT fk_tb_customer_info_business_kind2_parent;

DROP INDEX public.ix_tb_customer_info_tenant_business_kind1;
DROP INDEX public.ix_tb_customer_info_tenant_business_kind2;

ALTER TABLE public.tb_customer_info
    ALTER COLUMN business_kind1 TYPE CHARACTER VARYING
        USING business_kind1::CHARACTER VARYING,
    ALTER COLUMN business_kind2 TYPE CHARACTER VARYING
        USING business_kind2::CHARACTER VARYING;

ALTER TABLE public.tb_material_info
    DROP CONSTRAINT fk_tb_material_info_item_cls;

DROP INDEX public.ix_tb_material_info_tenant_item_cls;
ALTER TABLE public.tb_material_info
    DROP COLUMN item_cls_id;

DROP TABLE public.tb_cls_partner;
DROP TABLE public.tb_cls_item;

COMMIT;
