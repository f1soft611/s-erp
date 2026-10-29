\set ON_ERROR_STOP on
\encoding UTF8
\if :{?target_tenant_id}
\else
\echo 'target_tenant_id is required'
\quit 3
\endif

-- SQL_BODY: restores only presentation fields backed up by repair 20261029_004.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
CREATE TEMP TABLE demo_unrepair_input ON COMMIT DROP AS
SELECT :'target_tenant_id'::BIGINT AS tenant_id;
DO $$
DECLARE v_tenant BIGINT;
BEGIN
    SELECT tenant_id INTO STRICT v_tenant FROM demo_unrepair_input;
    IF v_tenant <= 0 OR NOT EXISTS (SELECT 1 FROM public.tb_tenant WHERE tenant_id = v_tenant) THEN
        RAISE EXCEPTION 'A valid positive target tenant is required';
    END IF;
    PERFORM pg_advisory_xact_lock(20261029, hashtext(v_tenant::TEXT));
END
$$;
LOCK TABLE public.tb_electronic_approval_main, public.tb_electronic_approval_line_info,
    public.tb_common_comment IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE demo_unrepair_documents ON COMMIT DROP AS
SELECT m.*
FROM public.tb_electronic_approval_main m JOIN demo_unrepair_input i USING (tenant_id)
WHERE m.contents_json -> '_demoSeed' ->> 'key' = 'S_ERP_GROUPWARE_DEMO_20261029'
  AND m.contents_json -> '_demoSeed' ? 'presentationRepair';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM demo_unrepair_documents m
        WHERE m.contents_json -> '_demoSeed' ->> 'lineFingerprint' IS DISTINCT FROM (
            SELECT md5(jsonb_agg(to_jsonb(l) ORDER BY l.electronic_approval_line_id)::TEXT)
            FROM public.tb_electronic_approval_line_info l
            WHERE l.tenant_id = m.tenant_id AND l.electronic_approval_id = m.electronic_approval_id)
        OR m.contents_json -> '_demoSeed' ->> 'systemFingerprint' IS DISTINCT FROM (
            SELECT md5(jsonb_agg(to_jsonb(c) ORDER BY c.comment_id)::TEXT)
            FROM public.tb_common_comment c
            WHERE c.tenant_id = m.tenant_id AND c.owner_type = 'APPROVAL'
              AND c.owner_id = m.electronic_approval_id AND c.comment_type = 'SYSTEM')
    ) THEN
        RAISE EXCEPTION 'Demo approval lines or system events have changed; restore refused';
    END IF;
END
$$;

UPDATE public.tb_electronic_approval_line_info l
SET action_comment = r.before_value
FROM demo_unrepair_documents m
CROSS JOIN LATERAL jsonb_to_recordset(
    m.contents_json #> '{_demoSeed,presentationRepair,lines}'
) AS r(id BIGINT, before_value TEXT)
WHERE l.tenant_id = m.tenant_id AND l.electronic_approval_id = m.electronic_approval_id
  AND l.electronic_approval_line_id = r.id;

UPDATE public.tb_common_comment c
SET content = r.before_value
FROM demo_unrepair_documents m
CROSS JOIN LATERAL jsonb_to_recordset(
    m.contents_json #> '{_demoSeed,presentationRepair,comments}'
) AS r(id BIGINT, before_value TEXT)
WHERE c.tenant_id = m.tenant_id AND c.owner_type = 'APPROVAL'
  AND c.owner_id = m.electronic_approval_id AND c.comment_id = r.id;

UPDATE public.tb_electronic_approval_main m
SET contents_json = jsonb_set(m.contents_json, '{_demoSeed}',
    original.contents_json #> '{_demoSeed,presentationRepair,previousMeta}')
FROM demo_unrepair_documents original
WHERE m.tenant_id = original.tenant_id AND m.electronic_approval_id = original.electronic_approval_id;
COMMIT;
