-- ONLY before business adoption: string-code references cannot be detected by FK.
-- Preserves preexisting, edited, parent-referenced and foreign-tenant rows.
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
END;
$$;
DELETE FROM public.tb_common_code_item i
USING public.tb_common_code_group g, quotation_code_context c, quotation_code_seed s
WHERE i.group_id = g.common_code_group_id
  AND i.tenant_id = c.tenant_id AND g.tenant_id = c.tenant_id
  AND g.group_code = s.group_code AND i.item_code = s.item_code
  AND i.item_dc = 'quotation-code-seed:20261117-006'
  AND i.item_nm = s.item_nm AND i.sort_order = s.item_sort AND i.use_at = 'Y'
  AND i.parent_item_id IS NULL AND i.updated_at IS NULL
  AND i.created_by IS NULL AND i.updated_by IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.tb_common_code_item child
      WHERE child.parent_item_id = i.common_code_item_id
  );
DELETE FROM public.tb_common_code_group g
USING quotation_code_context c,
    (SELECT DISTINCT group_code, group_nm, group_sort FROM quotation_code_seed) s
WHERE g.tenant_id = c.tenant_id AND g.group_code = s.group_code
  AND g.group_dc = 'quotation-code-seed:20261117-006'
  AND g.group_nm = s.group_nm AND g.sort_order = s.group_sort AND g.use_at = 'Y'
  AND g.parent_group_id IS NULL AND g.updated_at IS NULL
  AND g.created_by IS NULL AND g.updated_by IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.tb_common_code_item i WHERE i.group_id = g.common_code_group_id
  )
  AND NOT EXISTS (
      SELECT 1 FROM public.tb_common_code_group child
      WHERE child.parent_group_id = g.common_code_group_id
  );
COMMIT;
