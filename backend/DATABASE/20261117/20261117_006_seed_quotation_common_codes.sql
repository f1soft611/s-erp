-- psql -X -v ON_ERROR_STOP=1 -v target_tenant_id=<approved-id> -f <this-file>
-- Existing CURRENCY and ITEM_UNIT groups are intentionally not changed.
\set ON_ERROR_STOP on
\encoding UTF8
BEGIN;
CREATE TEMP TABLE quotation_code_context ON COMMIT DROP AS
SELECT :'target_tenant_id'::bigint AS tenant_id;
CREATE TEMP TABLE quotation_code_seed (
    group_code varchar(50), group_nm varchar(200), group_sort integer,
    item_code varchar(50), item_nm varchar(200), item_sort integer
) ON COMMIT DROP;
INSERT INTO quotation_code_seed VALUES
    ('INCOTERMS', 'Incoterms', 240, 'EXW', 'EXW', 10),
    ('INCOTERMS', 'Incoterms', 240, 'FCA', 'FCA', 20),
    ('INCOTERMS', 'Incoterms', 240, 'FAS', 'FAS', 30),
    ('INCOTERMS', 'Incoterms', 240, 'FOB', 'FOB', 40),
    ('INCOTERMS', 'Incoterms', 240, 'CFR', 'CFR', 50),
    ('INCOTERMS', 'Incoterms', 240, 'CIF', 'CIF', 60),
    ('INCOTERMS', 'Incoterms', 240, 'CPT', 'CPT', 70),
    ('INCOTERMS', 'Incoterms', 240, 'CIP', 'CIP', 80),
    ('INCOTERMS', 'Incoterms', 240, 'DAP', 'DAP', 90),
    ('INCOTERMS', 'Incoterms', 240, 'DPU', 'DPU', 100),
    ('INCOTERMS', 'Incoterms', 240, 'DDP', 'DDP', 110),
    ('PAYMENT_TERM', '결제조건', 250, 'CASH', '현금', 10),
    ('PAYMENT_TERM', '결제조건', 250, 'PREPAID', '선불', 20),
    ('PAYMENT_TERM', '결제조건', 250, 'NET30', '30일', 30),
    ('PAYMENT_TERM', '결제조건', 250, 'NET60', '60일', 40),
    ('PAYMENT_TERM', '결제조건', 250, 'NET90', '90일', 50);
LOCK TABLE public.tb_common_code_group, public.tb_common_code_item IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.tb_tenant t JOIN quotation_code_context c USING (tenant_id)
    ) THEN
        RAISE EXCEPTION 'Target tenant does not exist';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.tb_common_code_group g
        JOIN quotation_code_context c USING (tenant_id)
        WHERE g.group_code IN (SELECT group_code FROM quotation_code_seed)
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
    'quotation-code-seed:20261117-006', s.group_sort, 'Y'
FROM quotation_code_context c CROSS JOIN quotation_code_seed s
ON CONFLICT (tenant_id, group_code) DO NOTHING;
INSERT INTO public.tb_common_code_item (
    tenant_id, group_id, item_code, item_nm, item_dc, sort_order, use_at
)
SELECT c.tenant_id, g.common_code_group_id, s.item_code, s.item_nm,
    'quotation-code-seed:20261117-006', s.item_sort, 'Y'
FROM quotation_code_context c
JOIN public.tb_common_code_group g ON g.tenant_id = c.tenant_id
JOIN quotation_code_seed s ON s.group_code = g.group_code
ON CONFLICT (group_id, item_code) DO NOTHING;
COMMIT;
