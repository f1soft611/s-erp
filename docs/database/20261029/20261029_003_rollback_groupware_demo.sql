\set ON_ERROR_STOP on
\encoding UTF8
\if :{?target_tenant_id}
\else
\echo 'target_tenant_id is required'
\quit 3
\endif

-- SQL_BODY: refuses modified or used demo data; never rewinds shared counters.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE TEMP TABLE demo_rollback_input ON COMMIT DROP AS
SELECT :'target_tenant_id'::BIGINT AS tenant_id;

DO $$
DECLARE
    v_tenant BIGINT;
BEGIN
    SELECT tenant_id INTO STRICT v_tenant FROM demo_rollback_input;
    IF v_tenant <= 0 OR NOT EXISTS (
        SELECT 1 FROM public.tb_tenant WHERE tenant_id = v_tenant
    ) THEN
        RAISE EXCEPTION 'A valid positive target tenant is required';
    END IF;
    PERFORM pg_advisory_xact_lock(20261029, hashtext(v_tenant::TEXT));
END
$$;

-- Prevent new interactions between the guard checks and deletion.
-- These short locks block writes to these tables for ALL tenants.
LOCK TABLE public.tb_board_post, public.tb_electronic_approval_main,
    public.tb_electronic_approval_line_info, public.tb_common_comment,
    public.tb_common_comment_like, public.tb_common_file,
    public.tb_board_post_view_history, public.tb_notice_popup_dismissal,
    public.tb_electronic_approval_view_history, public.tb_electronic_approval_pin
IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE demo_rollback_owners ON COMMIT DROP AS
SELECT 'NOTICE'::TEXT AS owner_type, p.post_id AS owner_id, p.tenant_id,
       p.updated_at, (p.contents_json::JSONB -> '_demoSeed' ->> 'updatedAt')::TIMESTAMP AS expected_updated_at,
       p.is_deleted AS deleted, NULL::TEXT AS line_fingerprint, NULL::TEXT AS system_fingerprint
FROM public.tb_board_post p
JOIN demo_rollback_input input ON input.tenant_id = p.tenant_id
WHERE p.board_type_code = 'NOTICE'
  AND p.contents_json::JSONB -> '_demoSeed' ->> 'key' = 'S_ERP_GROUPWARE_DEMO_20261029'
UNION ALL
SELECT 'APPROVAL', m.electronic_approval_id, m.tenant_id, m.updated_at,
       (m.contents_json -> '_demoSeed' ->> 'updatedAt')::TIMESTAMP, m.deleted_yn,
       m.contents_json -> '_demoSeed' ->> 'lineFingerprint',
       m.contents_json -> '_demoSeed' ->> 'systemFingerprint'
FROM public.tb_electronic_approval_main m
JOIN demo_rollback_input input ON input.tenant_id = m.tenant_id
WHERE m.contents_json -> '_demoSeed' ->> 'key' = 'S_ERP_GROUPWARE_DEMO_20261029';

CREATE TEMP TABLE demo_rollback_comments ON COMMIT DROP AS
SELECT c.*
FROM public.tb_common_comment c
JOIN demo_rollback_owners o
  ON o.tenant_id = c.tenant_id AND o.owner_type = c.owner_type AND o.owner_id = c.owner_id;

DO $$
DECLARE
    v_tenant BIGINT;
    v_posts INTEGER;
    v_documents INTEGER;
    v_marked_comments INTEGER;
BEGIN
    SELECT tenant_id INTO STRICT v_tenant FROM demo_rollback_input;
    SELECT count(*) FILTER (WHERE owner_type = 'NOTICE'),
           count(*) FILTER (WHERE owner_type = 'APPROVAL')
    INTO v_posts, v_documents FROM demo_rollback_owners;
    SELECT count(*) INTO v_marked_comments FROM public.tb_common_comment
    WHERE tenant_id = v_tenant AND strpos(content, 'S_ERP_GROUPWARE_DEMO_20261029') > 0;
    IF v_posts = 0 AND v_documents = 0 AND v_marked_comments = 0 THEN
        RETURN;
    END IF;
    IF v_posts <> 8 OR v_documents <> 12 OR v_marked_comments NOT IN (57, 94) THEN
        RAISE EXCEPTION 'Demo batch is incomplete or has changed; manual review required';
    END IF;
    IF EXISTS (
        SELECT 1 FROM demo_rollback_owners
        WHERE updated_at IS DISTINCT FROM expected_updated_at OR deleted <> 'N'
    ) OR EXISTS (
        SELECT 1 FROM demo_rollback_owners o
        WHERE o.owner_type = 'APPROVAL'
          AND o.line_fingerprint IS DISTINCT FROM (
              SELECT md5(jsonb_agg(to_jsonb(l) ORDER BY l.electronic_approval_line_id)::TEXT)
              FROM public.tb_electronic_approval_line_info l
              WHERE l.tenant_id = o.tenant_id AND l.electronic_approval_id = o.owner_id
          )
    ) OR EXISTS (
        SELECT 1 FROM demo_rollback_owners o
        WHERE o.owner_type = 'APPROVAL' AND o.system_fingerprint IS NOT NULL
          AND o.system_fingerprint IS DISTINCT FROM (
              SELECT md5(jsonb_agg(to_jsonb(c) ORDER BY c.comment_id)::TEXT)
              FROM public.tb_common_comment c
              WHERE c.tenant_id = o.tenant_id AND c.owner_type = 'APPROVAL'
                AND c.owner_id = o.owner_id AND c.comment_type = 'SYSTEM'
          )
    ) OR EXISTS (
        SELECT 1 FROM demo_rollback_comments c
        JOIN demo_rollback_owners o USING (tenant_id, owner_type, owner_id)
        WHERE (strpos(c.content, 'S_ERP_GROUPWARE_DEMO_20261029') = 0
               AND NOT (c.comment_type = 'SYSTEM' AND o.system_fingerprint IS NOT NULL))
           OR c.updated_at <> c.created_at OR c.deleted_yn <> 'N'
    ) OR (SELECT count(*) FROM demo_rollback_comments) <> 94
      OR (SELECT count(*) FROM public.tb_electronic_approval_line_info l
          JOIN demo_rollback_owners o ON o.owner_type = 'APPROVAL'
           AND o.tenant_id = l.tenant_id AND o.owner_id = l.electronic_approval_id) <> 35 THEN
        RAISE EXCEPTION 'Demo data has changed or received real interactions; rollback refused';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.tb_common_comment c
        WHERE c.parent_comment_id IN (SELECT comment_id FROM demo_rollback_comments)
          AND c.comment_id NOT IN (SELECT comment_id FROM demo_rollback_comments)
    ) OR EXISTS (
        SELECT 1 FROM public.tb_common_comment_like l
        JOIN demo_rollback_comments c ON c.tenant_id = l.tenant_id AND c.comment_id = l.comment_id
    ) OR EXISTS (
        SELECT 1 FROM public.tb_common_file f
        JOIN demo_rollback_owners o
          ON o.tenant_id = f.tenant_id AND o.owner_type = f.owner_type AND o.owner_id = f.owner_id
    ) OR EXISTS (
        SELECT 1 FROM public.tb_common_file f
        JOIN demo_rollback_comments c
          ON c.tenant_id = f.tenant_id AND f.owner_type = c.owner_type || '_COMMENT'
         AND f.owner_id = c.comment_id
    ) OR EXISTS (
        SELECT 1 FROM public.tb_board_post_view_history h
        JOIN demo_rollback_owners o
          ON o.owner_type = 'NOTICE' AND o.tenant_id = h.tenant_id AND o.owner_id = h.post_id
    ) OR EXISTS (
        SELECT 1 FROM public.tb_notice_popup_dismissal h
        JOIN demo_rollback_owners o
          ON o.owner_type = 'NOTICE' AND o.tenant_id = h.tenant_id AND o.owner_id = h.post_id
    ) OR EXISTS (
        SELECT 1 FROM public.tb_electronic_approval_view_history h
        JOIN demo_rollback_owners o ON o.owner_type = 'APPROVAL'
         AND o.tenant_id = h.tenant_id AND o.owner_id = h.electronic_approval_id
    ) OR EXISTS (
        SELECT 1 FROM public.tb_electronic_approval_pin h
        JOIN demo_rollback_owners o ON o.owner_type = 'APPROVAL'
         AND o.tenant_id = h.tenant_id AND o.owner_id = h.electronic_approval_id
    ) THEN
        RAISE EXCEPTION 'Real interactions reference this demo batch; rollback refused';
    END IF;
END
$$;

DELETE FROM public.tb_common_comment c
USING demo_rollback_comments demo
WHERE c.tenant_id = demo.tenant_id AND c.comment_id = demo.comment_id;

DELETE FROM public.tb_electronic_approval_line_info l
USING demo_rollback_owners o
WHERE o.owner_type = 'APPROVAL'
  AND l.tenant_id = o.tenant_id AND l.electronic_approval_id = o.owner_id;

DELETE FROM public.tb_electronic_approval_main m
USING demo_rollback_owners o
WHERE o.owner_type = 'APPROVAL'
  AND m.tenant_id = o.tenant_id AND m.electronic_approval_id = o.owner_id;

DELETE FROM public.tb_board_post p
USING demo_rollback_owners o
WHERE o.owner_type = 'NOTICE' AND p.tenant_id = o.tenant_id AND p.post_id = o.owner_id;

COMMIT;
