\set ON_ERROR_STOP on
\encoding UTF8
\if :{?target_tenant_id}
\else
\echo 'target_tenant_id is required'
\quit 3
\endif

-- SQL_BODY: repairs exact synthetic values only; no document recreation.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
CREATE TEMP TABLE demo_repair_input ON COMMIT DROP AS
SELECT :'target_tenant_id'::BIGINT AS tenant_id;
DO $$
DECLARE v_tenant BIGINT;
BEGIN
    SELECT tenant_id INTO STRICT v_tenant FROM demo_repair_input;
    IF v_tenant <= 0 OR NOT EXISTS (SELECT 1 FROM public.tb_tenant WHERE tenant_id = v_tenant) THEN
        RAISE EXCEPTION 'A valid positive target tenant is required';
    END IF;
    PERFORM pg_advisory_xact_lock(20261029, hashtext(v_tenant::TEXT));
END
$$;
LOCK TABLE public.tb_electronic_approval_main, public.tb_electronic_approval_line_info,
    public.tb_common_comment IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE demo_repair_documents ON COMMIT DROP AS
SELECT m.*
FROM public.tb_electronic_approval_main m
JOIN demo_repair_input i USING (tenant_id)
WHERE m.contents_json -> '_demoSeed' ->> 'key' = 'S_ERP_GROUPWARE_DEMO_20261029'
  AND NOT (m.contents_json -> '_demoSeed' ? 'presentationRepair');

CREATE TEMP TABLE demo_repair_lines ON COMMIT DROP AS
SELECT l.electronic_approval_line_id AS id, l.electronic_approval_id AS document_id,
       l.tenant_id, l.action_comment AS before_value, NULL::TEXT AS after_value
FROM public.tb_electronic_approval_line_info l
JOIN demo_repair_documents m USING (tenant_id, electronic_approval_id)
WHERE l.action_status = 'APPROVED' AND l.action_comment = '검토 내용을 확인하여 승인합니다.';

CREATE TEMP TABLE demo_repair_comments ON COMMIT DROP AS
SELECT c.comment_id AS id, c.owner_id AS document_id, c.tenant_id,
       c.content AS before_value, text.after_value
FROM public.tb_common_comment c
JOIN demo_repair_documents m
  ON m.tenant_id = c.tenant_id AND m.electronic_approval_id = c.owner_id
JOIN (VALUES
    ('DRAFT_SAVED', '문서가 임시저장되었습니다.', '문서가 임시저장되었습니다.'),
    ('SUBMITTED', '문서가 결재신청되었습니다.', '문서가 결재신청되었습니다.'),
    ('APPROVED', '검토 내용을 확인하여 승인합니다.', '문서가 승인되었습니다.'),
    ('APPROVED', '결재 처리 내용을 확인했습니다.', '문서가 승인되었습니다.'),
    ('REJECTED', '내부 자원을 우선 활용하는 방향으로 재검토해 주세요.', '내부 자원을 우선 활용하는 방향으로 재검토해 주세요.'),
    ('RETURNED', '담당 범위와 세부 내역을 보완한 뒤 재상신해 주세요.', '담당 범위와 세부 내역을 보완한 뒤 재상신해 주세요.'),
    ('COMPLETED', '업무연락이 발송되었습니다.', '업무연락이 발송되었습니다.'),
    ('COMPLETED', '문서 결재가 완료되었습니다.', '문서 결재가 완료되었습니다.'),
    ('REFERENCE_CONFIRMED', '업무연락 내용을 확인했습니다.', '업무연락 내용을 확인했습니다.')
) text(event, before_value, after_value)
  ON c.event_type = text.event
 AND c.content = '<p>' || text.before_value || '</p><!--S_ERP_GROUPWARE_DEMO_20261029-->'
WHERE c.owner_type = 'APPROVAL' AND c.comment_type = 'SYSTEM'
  AND c.deleted_yn = 'N' AND c.updated_at = c.created_at;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM demo_repair_documents m
        WHERE EXISTS (SELECT 1 FROM demo_repair_lines l WHERE l.document_id = m.electronic_approval_id)
          AND m.contents_json -> '_demoSeed' ->> 'lineFingerprint' IS DISTINCT FROM (
              SELECT md5(jsonb_agg(to_jsonb(l) ORDER BY l.electronic_approval_line_id)::TEXT)
              FROM public.tb_electronic_approval_line_info l
              WHERE l.tenant_id = m.tenant_id AND l.electronic_approval_id = m.electronic_approval_id
          )
    ) THEN
        RAISE EXCEPTION 'Demo approval lines have changed; repair refused';
    END IF;
END
$$;

UPDATE public.tb_electronic_approval_line_info l
SET action_comment = r.after_value
FROM demo_repair_lines r
WHERE l.tenant_id = r.tenant_id AND l.electronic_approval_line_id = r.id;

UPDATE public.tb_common_comment c
SET content = r.after_value
FROM demo_repair_comments r
WHERE c.tenant_id = r.tenant_id AND c.comment_id = r.id;

UPDATE public.tb_electronic_approval_main m
SET contents_json = jsonb_set(m.contents_json, '{_demoSeed}', (m.contents_json -> '_demoSeed') ||
    jsonb_build_object(
        'presentationRepair', jsonb_build_object(
            'previousMeta', original.contents_json -> '_demoSeed',
            'lines', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM demo_repair_lines r
                WHERE r.document_id = m.electronic_approval_id), '[]'::JSONB),
            'comments', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM demo_repair_comments r
                WHERE r.document_id = m.electronic_approval_id), '[]'::JSONB)),
        'lineFingerprint', (SELECT md5(jsonb_agg(to_jsonb(l) ORDER BY l.electronic_approval_line_id)::TEXT)
            FROM public.tb_electronic_approval_line_info l
            WHERE l.tenant_id = m.tenant_id AND l.electronic_approval_id = m.electronic_approval_id),
        'systemFingerprint', (SELECT md5(jsonb_agg(to_jsonb(c) ORDER BY c.comment_id)::TEXT)
            FROM public.tb_common_comment c
            WHERE c.tenant_id = m.tenant_id AND c.owner_type = 'APPROVAL'
              AND c.owner_id = m.electronic_approval_id AND c.comment_type = 'SYSTEM')
    ))
FROM demo_repair_documents original
WHERE m.tenant_id = original.tenant_id AND m.electronic_approval_id = original.electronic_approval_id
  AND (EXISTS (SELECT 1 FROM demo_repair_lines r WHERE r.document_id = m.electronic_approval_id)
    OR EXISTS (SELECT 1 FROM demo_repair_comments r WHERE r.document_id = m.electronic_approval_id));

COMMIT;
