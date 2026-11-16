-- Destructive fixtures: run ONLY in a new disposable database with this name.
\set ON_ERROR_STOP on
SELECT current_database() = 'test_page_common_codes' AS safe_database \gset
\if :safe_database
\else
    \echo 'Refusing to run outside test_page_common_codes.'
    \quit 3
\endif
SET client_encoding = 'UTF8';
CREATE TABLE public.tb_tenant (tenant_id bigint PRIMARY KEY);
INSERT INTO public.tb_tenant VALUES (101), (202), (303), (404);
\ir '..\\..\\..\\docs\\database\\2026-09-11\\20260911_003_create_common_code_schema.sql'

CREATE FUNCTION pg_temp.assert_true(ok boolean, message text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION '%', message; END IF;
END;
$$;

-- Existing tenant customization must survive both seed and rollback.
INSERT INTO public.tb_common_code_group
    (tenant_id, group_code, group_nm, sort_order)
VALUES (101, 'ITEM_PARTNER_TRADE_TYPE', 'CUSTOM GROUP', 999),
       (303, 'SALES_DELIVERY_TYPE', 'OTHER TENANT', 999),
       (404, 'SALES_DELIVERY_TYPE', 'DISABLED GROUP', 999);
UPDATE public.tb_common_code_group SET use_at = 'N' WHERE tenant_id = 404;
INSERT INTO public.tb_common_code_item
    (tenant_id, group_id, item_code, item_nm, sort_order, use_at)
SELECT 101, common_code_group_id, '매입', 'CUSTOM ITEM', 999, 'N'
FROM public.tb_common_code_group WHERE tenant_id = 101;
CREATE TEMP TABLE other_tenant_snapshot AS
SELECT * FROM public.tb_common_code_group WHERE tenant_id = 303;

\set target_tenant_id 101
\ir 20261116_003_seed_page_common_codes.sql
\ir 20261116_003_seed_page_common_codes.sql
SELECT pg_temp.assert_true(
    (SELECT count(*) = 2 FROM public.tb_common_code_group WHERE tenant_id = 101),
    'Base seed must be idempotent and not include prototype groups');
SELECT pg_temp.assert_true(
    (SELECT count(*) = 4 FROM public.tb_common_code_item WHERE tenant_id = 101),
    'Base seed must fill missing items without duplicates');
SELECT pg_temp.assert_true(
    EXISTS (SELECT 1 FROM public.tb_common_code_item
            WHERE tenant_id = 101 AND item_code = '매입'
              AND item_nm = 'CUSTOM ITEM' AND sort_order = 999 AND use_at = 'N'),
    'Existing inactive/custom item was overwritten');
SELECT pg_temp.assert_true(
    EXISTS (SELECT 1 FROM public.tb_common_code_group
            WHERE tenant_id = 101 AND group_nm = 'CUSTOM GROUP' AND sort_order = 999),
    'Existing custom group was overwritten');

\ir 20261116_003_seed_work_standard_codes_optional.sql
\ir 20261116_003_seed_work_standard_codes_optional.sql
SELECT pg_temp.assert_true(
    (SELECT count(*) = 4 FROM public.tb_common_code_group WHERE tenant_id = 101)
    AND (SELECT count(*) = 9 FROM public.tb_common_code_item WHERE tenant_id = 101),
    'Optional seed must add exactly two groups and five items idempotently');
CREATE TEMP TABLE expected_items (group_code text, item_code text, item_nm text, sort_order int);
INSERT INTO expected_items VALUES
    ('ITEM_PARTNER_TRADE_TYPE', '매입', 'CUSTOM ITEM', 999),
    ('ITEM_PARTNER_TRADE_TYPE', '매출', '매출', 20),
    ('SALES_DELIVERY_TYPE', 'DIRECT', '직출하', 10),
    ('SALES_DELIVERY_TYPE', 'ORDER', '수주출하', 20),
    ('WORK_STANDARD_VERSION_STATUS', '양산', '양산', 10),
    ('WORK_STANDARD_VERSION_STATUS', '샘플', '샘플', 20),
    ('WORK_STANDARD_VERSION_STATUS', '폐기', '폐기', 30),
    ('WORK_STANDARD_SHELF_LIFE_BASE', '반제품 생산완료일', '반제품 생산완료일', 10),
    ('WORK_STANDARD_SHELF_LIFE_BASE', '제품 생산완료일', '제품 생산완료일', 20);
SELECT pg_temp.assert_true(
    NOT EXISTS (
        SELECT e.* FROM expected_items e
        EXCEPT
        SELECT g.group_code, i.item_code, i.item_nm, i.sort_order
        FROM public.tb_common_code_item i JOIN public.tb_common_code_group g
          ON g.common_code_group_id = i.group_id
        WHERE i.tenant_id = 101
    ), 'Stored codes, labels or order differ from source definitions');

-- Edited rows and parent references must be retained by rollback.
UPDATE public.tb_common_code_item SET item_nm = 'EDITED', updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = 101 AND item_code = '양산';
INSERT INTO public.tb_common_code_group (tenant_id, group_code, group_nm, parent_group_id)
SELECT 101, 'CUSTOM_CHILD', 'CUSTOM CHILD', common_code_group_id
FROM public.tb_common_code_group WHERE tenant_id = 101 AND group_code = 'SALES_DELIVERY_TYPE';
INSERT INTO public.tb_common_code_item
    (tenant_id, group_id, item_code, item_nm, parent_item_id)
SELECT 101, child.common_code_group_id, 'CUSTOM_REF', 'CUSTOM REF', i.common_code_item_id
FROM public.tb_common_code_group child
JOIN public.tb_common_code_group parent ON parent.common_code_group_id = child.parent_group_id
JOIN public.tb_common_code_item i ON i.group_id = parent.common_code_group_id AND i.item_code = 'DIRECT'
WHERE child.tenant_id = 101 AND child.group_code = 'CUSTOM_CHILD';
\ir 20261116_003_rollback_page_common_codes.sql
\ir 20261116_003_rollback_page_common_codes.sql
SELECT pg_temp.assert_true(
    (SELECT count(*) = 4 FROM public.tb_common_code_item WHERE tenant_id = 101),
    'Rollback must preserve customized, edited and referenced items only');
SELECT pg_temp.assert_true(
    EXISTS (SELECT 1 FROM public.tb_common_code_item WHERE tenant_id = 101 AND item_nm = 'EDITED')
    AND EXISTS (SELECT 1 FROM public.tb_common_code_item WHERE tenant_id = 101 AND item_code = 'DIRECT')
    AND EXISTS (SELECT 1 FROM public.tb_common_code_item WHERE tenant_id = 101 AND item_nm = 'CUSTOM ITEM'),
    'Rollback removed edited, referenced or preexisting rows');
SELECT pg_temp.assert_true(
    NOT EXISTS ((SELECT * FROM other_tenant_snapshot EXCEPT
                 SELECT * FROM public.tb_common_code_group WHERE tenant_id = 303))
    AND NOT EXISTS (SELECT 1 FROM public.tb_common_code_item WHERE tenant_id = 303),
    'Another tenant changed');

-- Clean tenant: full rollback and re-application.
\set target_tenant_id 202
\ir 20261116_003_seed_page_common_codes.sql
\ir 20261116_003_seed_work_standard_codes_optional.sql
SELECT pg_temp.assert_true(
    (SELECT count(*) = 9 FROM public.tb_common_code_item WHERE tenant_id = 202),
    'Clean tenant did not receive nine items');
\ir 20261116_003_rollback_page_common_codes.sql
SELECT pg_temp.assert_true(
    NOT EXISTS (SELECT 1 FROM public.tb_common_code_group WHERE tenant_id = 202)
    AND NOT EXISTS (SELECT 1 FROM public.tb_common_code_item WHERE tenant_id = 202),
    'Rollback did not fully remove untouched seed-owned rows');
\ir 20261116_003_seed_page_common_codes.sql
SELECT pg_temp.assert_true(
    (SELECT count(*) = 4 FROM public.tb_common_code_item WHERE tenant_id = 202),
    'Re-application after rollback failed');
\echo 'PASS: values, labels, order, optional isolation, idempotency, customization, tenant isolation, rollback and re-application.'
