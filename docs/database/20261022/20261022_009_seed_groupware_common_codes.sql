-- 20261022_009 Groupware common-code baseline.
-- Seeds canonical system codes for each active tenant without overwriting
-- existing group or item definitions.

BEGIN;

INSERT INTO public.tb_common_code_group (
    tenant_id,
    group_code,
    group_nm,
    group_dc,
    sort_order,
    use_at
)
SELECT
    t.tenant_id,
    seed.group_code,
    seed.group_nm,
    '',
    seed.sort_order,
    'Y'
FROM public.tb_tenant t
CROSS JOIN (
    VALUES
        ('NOTICE_GUBUN', '공지사항 구분', 0),
        ('WF_ARCHIVE_CATEGORY', '자료실 분류', 0),
        ('WF_DOC_CATEGORY', '문서구분(그룹웨어)', 0),
        ('WF_FORM_CATEGORY', '기안양식 분류', 10),
        ('WF_FORM_CYCLE', '기안양식 등록주기', 20)
) AS seed(group_code, group_nm, sort_order)
WHERE t.use_at = 'Y'
ON CONFLICT (tenant_id, group_code) DO NOTHING;

INSERT INTO public.tb_common_code_item (
    tenant_id,
    group_id,
    item_code,
    item_nm,
    item_dc,
    sort_order,
    use_at
)
SELECT
    g.tenant_id,
    g.common_code_group_id,
    seed.item_code,
    seed.item_nm,
    '',
    seed.sort_order,
    'Y'
FROM public.tb_common_code_group g
JOIN public.tb_tenant t
    ON t.tenant_id = g.tenant_id
   AND t.use_at = 'Y'
JOIN (
    VALUES
        ('NOTICE_GUBUN', 'ALL', '전체', 1),
        ('NOTICE_GUBUN', 'IMPORTANT', '중요 공지', 2),
        ('NOTICE_GUBUN', 'OPERATION', '운영', 3),
        ('NOTICE_GUBUN', 'SECURITY', '보안', 4),
        ('NOTICE_GUBUN', 'MUST_READ', '필독', 5),
        ('WF_ARCHIVE_CATEGORY', '001', '업무양식', 0),
        ('WF_ARCHIVE_CATEGORY', '002', '메뉴얼', 0),
        ('WF_ARCHIVE_CATEGORY', '003', '교육자료', 0),
        ('WF_ARCHIVE_CATEGORY', '004', '테스트자료', 0),
        ('WF_DOC_CATEGORY', '001', '기안', 0),
        ('WF_DOC_CATEGORY', '004', '지출', 0),
        ('WF_DOC_CATEGORY', '008', '업무', 0),
        ('WF_DOC_CATEGORY', '031', '근태', 0),
        ('WF_FORM_CATEGORY', '001', '기안서', 1),
        ('WF_FORM_CATEGORY', '008', '업무연락', 2),
        ('WF_FORM_CATEGORY', '004', '지출결의', 3),
        ('WF_FORM_CATEGORY', '031', '근태신청', 4),
        ('WF_FORM_CATEGORY', '201', 'HACCP(선행)', 5),
        ('WF_FORM_CATEGORY', '202', 'HACCP(HA)', 6),
        ('WF_FORM_CYCLE', 'DAY', '일', 10),
        ('WF_FORM_CYCLE', 'WEEK', '주', 20),
        ('WF_FORM_CYCLE', 'MONTH', '월', 30),
        ('WF_FORM_CYCLE', 'EVENT', '발생시', 40)
) AS seed(group_code, item_code, item_nm, sort_order)
    ON seed.group_code = g.group_code
WHERE g.use_at = 'Y'
ON CONFLICT (group_id, item_code) DO NOTHING;

COMMIT;
