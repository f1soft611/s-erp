\set ON_ERROR_STOP on
\if :{?target_tenant_id}
\else
\echo 'target_tenant_id is required; pass it with psql -v target_tenant_id=<tenant_id>'
\quit 3
\endif

BEGIN;

CREATE TEMP TABLE sample_seed_target ON COMMIT DROP AS
SELECT :'target_tenant_id'::BIGINT AS tenant_id;

DO $$
DECLARE
    v_row_count INTEGER;
BEGIN
    PERFORM table_name
    FROM public.ids
    WHERE table_name IN ('tb_customer_info', 'tb_material_info')
    ORDER BY table_name
    FOR UPDATE;
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count <> 2 THEN
        RAISE EXCEPTION 'Both customer and material ID generator counters must already exist';
    END IF;
END
$$;

LOCK TABLE public.tb_customer_info IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.tb_material_info IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE sample_seed_business_numbers ON COMMIT DROP AS
WITH prefixes AS (
    SELECT
        n,
        lpad((999000000::BIGINT + n)::TEXT, 9, '0') AS prefix
    FROM generate_series(1, 100) AS numbers(n)
),
weighted AS (
    SELECT
        n,
        prefix,
        substring(prefix, 1, 1)::INTEGER
          + substring(prefix, 2, 1)::INTEGER * 3
          + substring(prefix, 3, 1)::INTEGER * 7
          + substring(prefix, 4, 1)::INTEGER
          + substring(prefix, 5, 1)::INTEGER * 3
          + substring(prefix, 6, 1)::INTEGER * 7
          + substring(prefix, 7, 1)::INTEGER
          + substring(prefix, 8, 1)::INTEGER * 3
          + substring(prefix, 9, 1)::INTEGER * 5
          + floor(substring(prefix, 9, 1)::NUMERIC * 5 / 10)::INTEGER AS total
    FROM prefixes
)
SELECT
    n,
    prefix || (((10 - total % 10) % 10 + 1) % 10)::TEXT AS business_no
FROM weighted;

DO $$
DECLARE
    v_tenant_id BIGINT;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM sample_seed_target;

    IF NOT EXISTS (
        SELECT 1 FROM public.tb_tenant WHERE tenant_id = v_tenant_id
    ) THEN
        RAISE EXCEPTION 'Target tenant does not exist';
    END IF;
    IF NOT EXISTS (
        SELECT 1
        FROM public.tb_common_code_group g
        JOIN public.tb_common_code_item i
          ON i.group_id = g.common_code_group_id
         AND i.tenant_id = g.tenant_id
        WHERE g.tenant_id = v_tenant_id
          AND g.group_code = 'ITEM_TYPE'
          AND g.use_at = 'Y'
          AND i.use_at = 'Y'
          AND char_length(i.item_code) <= 14
    ) THEN
        RAISE EXCEPTION 'Target tenant has no active ITEM_TYPE codes';
    END IF;
    IF NOT EXISTS (
        SELECT 1
        FROM public.tb_common_code_group g
        JOIN public.tb_common_code_item i
          ON i.group_id = g.common_code_group_id
         AND i.tenant_id = g.tenant_id
        WHERE g.tenant_id = v_tenant_id
          AND g.group_code = 'ITEM_UNIT'
          AND g.use_at = 'Y'
          AND i.use_at = 'Y'
          AND char_length(i.item_code) <= 6
    ) THEN
        RAISE EXCEPTION 'Target tenant has no active ITEM_UNIT codes';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM public.tb_customer_info c
        WHERE c.tenant_id = v_tenant_id
          AND (
              c.cust_memo = 'SAMPLE_SEED_20261023'
              OR btrim(c.customer_name) IN (
                  SELECT '샘플 거래처 ' || lpad(n::TEXT, 3, '0')
                  FROM generate_series(1, 100) AS numbers(n)
              )
          )
    ) THEN
        RAISE EXCEPTION 'Sample customer names or marker already exist for target tenant';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM public.tb_customer_info c
        JOIN sample_seed_business_numbers sample_no
          ON regexp_replace(COALESCE(c.business_no, ''), '[^0-9]', '', 'g')
             = sample_no.business_no
        WHERE c.tenant_id = v_tenant_id
    ) THEN
        RAISE EXCEPTION 'Sample business numbers already exist for target tenant';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM public.tb_material_info m
        WHERE m.tenant_id = v_tenant_id
          AND (
              m.etc = 'SAMPLE_SEED_20261023'
              OR m.material_name IN (
                  SELECT '샘플 품목 ' || lpad(n::TEXT, 3, '0')
                  FROM generate_series(1, 100) AS numbers(n)
              )
          )
    ) THEN
        RAISE EXCEPTION 'Sample material names or marker already exist for target tenant';
    END IF;
END
$$;

CREATE TEMP TABLE sample_seed_options ON COMMIT DROP AS
SELECT
    array_agg(i.item_code ORDER BY i.sort_order, i.item_code)
        FILTER (WHERE g.group_code = 'ITEM_TYPE') AS item_type_codes,
    array_agg(i.item_code ORDER BY i.sort_order, i.item_code)
        FILTER (WHERE g.group_code = 'ITEM_UNIT') AS unit_codes,
    array_agg(i.item_code ORDER BY i.sort_order, i.item_code)
        FILTER (WHERE g.group_code = 'MATERIAL_TYPE') AS material_kind_codes,
    array_agg(i.item_code ORDER BY i.sort_order, i.item_code)
        FILTER (WHERE g.group_code = 'STORE_METHOD') AS store_method_codes
FROM public.tb_common_code_group g
JOIN public.tb_common_code_item i
  ON i.group_id = g.common_code_group_id
 AND i.tenant_id = g.tenant_id
WHERE g.tenant_id = (SELECT tenant_id FROM sample_seed_target)
  AND g.use_at = 'Y'
  AND i.use_at = 'Y'
  AND (
      (g.group_code = 'ITEM_TYPE' AND char_length(i.item_code) <= 14)
      OR (g.group_code = 'ITEM_UNIT' AND char_length(i.item_code) <= 6)
      OR (
          g.group_code IN ('MATERIAL_TYPE', 'STORE_METHOD')
          AND char_length(i.item_code) <= 50
      )
  )
  AND g.group_code IN ('ITEM_TYPE', 'ITEM_UNIT', 'MATERIAL_TYPE', 'STORE_METHOD');

CREATE TEMP TABLE sample_seed_customer_range ON COMMIT DROP AS
WITH max_code AS (
    SELECT COALESCE(MAX(customer_code::BIGINT), 0::BIGINT) AS value
    FROM public.tb_customer_info
    WHERE customer_code ~ '^[0-9]{1,6}$'
),
reserved AS (
    UPDATE public.ids ids
    SET next_id = GREATEST(ids.next_id, max_code.value + 1) + 100,
        updated_at = CURRENT_TIMESTAMP
    FROM max_code
    WHERE ids.table_name = 'tb_customer_info'
    RETURNING ids.next_id - 100 AS first_code
)
SELECT first_code, first_code + 99 AS last_code FROM reserved;

CREATE TEMP TABLE sample_seed_material_range ON COMMIT DROP AS
WITH max_code AS (
    SELECT COALESCE(MAX(material_code::BIGINT), 0::BIGINT) AS value
    FROM public.tb_material_info
    WHERE material_code ~ '^[0-9]{1,6}$'
),
reserved AS (
    UPDATE public.ids ids
    SET next_id = GREATEST(ids.next_id, max_code.value + 1) + 100,
        updated_at = CURRENT_TIMESTAMP
    FROM max_code
    WHERE ids.table_name = 'tb_material_info'
    RETURNING ids.next_id - 100 AS first_code
)
SELECT first_code, first_code + 99 AS last_code FROM reserved;

DO $$
BEGIN
    IF (SELECT count(*) FROM sample_seed_options) <> 1
       OR COALESCE((SELECT cardinality(item_type_codes) FROM sample_seed_options), 0) < 1
       OR COALESCE((SELECT cardinality(unit_codes) FROM sample_seed_options), 0) < 1 THEN
        RAISE EXCEPTION 'Required sample seed options are missing';
    END IF;
    IF (SELECT count(*) FROM sample_seed_customer_range) <> 1
       OR (SELECT count(*) FROM sample_seed_material_range) <> 1 THEN
        RAISE EXCEPTION 'Unable to reserve both ID generator ranges';
    END IF;
    IF (SELECT first_code < 1 OR last_code > 999999
        FROM sample_seed_customer_range)
       OR (SELECT first_code < 1 OR last_code > 999999
           FROM sample_seed_material_range) THEN
        RAISE EXCEPTION 'Reserved sample codes exceed the six-digit ID generator range';
    END IF;
END
$$;

WITH generated AS (
    SELECT
        t.tenant_id,
        r.first_code + n - 1 AS code,
        n,
        sample_no.business_no
    FROM sample_seed_target t
    CROSS JOIN sample_seed_customer_range r
    CROSS JOIN generate_series(1, 100) AS numbers(n)
    JOIN sample_seed_business_numbers sample_no USING (n)
)
INSERT INTO public.tb_customer_info (
    tenant_id, customer_code, customer_name, cust_name_abbr, business_no,
    business_status_1, business_item_1, cust_memo, use_at, created_at, updated_at
)
SELECT
    tenant_id,
    lpad(code::TEXT, 6, '0'),
    '샘플 거래처 ' || lpad(n::TEXT, 3, '0'),
    '샘플' || lpad(n::TEXT, 3, '0'),
    business_no,
    '샘플 도매업',
    '테스트 품목 공급',
    'SAMPLE_SEED_20261023',
    'Y',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM generated;

WITH generated AS (
    SELECT
        t.tenant_id,
        material_range.first_code + n - 1 AS material_code_value,
        customer_range.first_code + n - 1 AS customer_code_value,
        n,
        options.item_type_codes,
        options.unit_codes,
        options.material_kind_codes,
        options.store_method_codes
    FROM sample_seed_target t
    CROSS JOIN sample_seed_material_range material_range
    CROSS JOIN sample_seed_customer_range customer_range
    CROSS JOIN sample_seed_options options
    CROSS JOIN generate_series(1, 100) AS numbers(n)
)
INSERT INTO public.tb_material_info (
    tenant_id, material_code, material_name, material_spec, material_weight,
    unit, material_type_code, customer_code, safe_invoice, material_kind,
    store_method, expiryed_status, expiryed_count, delete_status, mat_cata_type,
    etc, created_at, updated_at
)
SELECT
    tenant_id,
    lpad(material_code_value::TEXT, 6, '0'),
    '샘플 품목 ' || lpad(n::TEXT, 3, '0'),
    '샘플 규격 ' || lpad(n::TEXT, 3, '0'),
    1000 + n,
    unit_codes[1 + ((n - 1) % cardinality(unit_codes))],
    item_type_codes[1 + ((n - 1) % cardinality(item_type_codes))],
    lpad(customer_code_value::TEXT, 6, '0'),
    10 + n,
    CASE WHEN COALESCE(cardinality(material_kind_codes), 0) > 0
         THEN material_kind_codes[1 + ((n - 1) % cardinality(material_kind_codes))]
         ELSE NULL END,
    CASE WHEN COALESCE(cardinality(store_method_codes), 0) > 0
         THEN store_method_codes[1 + ((n - 1) % cardinality(store_method_codes))]
         ELSE NULL END,
    'NONE',
    NULL,
    'N',
    '',
    'SAMPLE_SEED_20261023',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM generated;

DO $$
DECLARE
    v_tenant_id BIGINT;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM sample_seed_target;
    IF (SELECT count(*) FROM public.tb_customer_info
        WHERE tenant_id = v_tenant_id AND cust_memo = 'SAMPLE_SEED_20261023') <> 100
       OR (SELECT count(*) FROM public.tb_material_info
           WHERE tenant_id = v_tenant_id AND etc = 'SAMPLE_SEED_20261023') <> 100 THEN
        RAISE EXCEPTION 'Sample seed row count verification failed';
    END IF;
END
$$;

COMMIT;
