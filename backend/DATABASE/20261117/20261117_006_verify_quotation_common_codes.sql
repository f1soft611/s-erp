\set ON_ERROR_STOP on
\encoding UTF8
WITH expected(group_code) AS (
    VALUES ('INCOTERMS'), ('PAYMENT_TERM'), ('CURRENCY'), ('ITEM_UNIT')
)
SELECT e.group_code, g.group_nm, g.use_at,
    COUNT(i.common_code_item_id) FILTER (WHERE i.use_at = 'Y') AS active_item_count
FROM expected e
LEFT JOIN public.tb_common_code_group g
  ON g.group_code = e.group_code AND g.tenant_id = :'target_tenant_id'::bigint
LEFT JOIN public.tb_common_code_item i
  ON i.group_id = g.common_code_group_id AND i.tenant_id = g.tenant_id
GROUP BY e.group_code, g.group_nm, g.use_at
ORDER BY e.group_code;
