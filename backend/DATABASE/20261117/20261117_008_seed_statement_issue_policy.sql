-- 20261117_008 거래명세서 발행 정책 및 메뉴명 변경
-- 정책: STATEMENT_ISSUE_MODE (AUTO: 출하등록 시 자동 발행 / MANUAL: 직접 발행), 기본값 MANUAL

INSERT INTO tb_system_policy (
    tenant_id, policy_code, policy_nm, category_nm, policy_dc, value_type,
    value_json, options_json, min_value, max_value, unit_nm, version, system_policy_at
)
SELECT t.tenant_id,
       'STATEMENT_ISSUE_MODE',
       '거래명세서 발행 방식',
       '영업',
       '출하등록 시 거래명세서를 자동 발행할지(AUTO), 직접 발행할지(MANUAL) 설정합니다.',
       'SELECT',
       '"MANUAL"'::jsonb,
       '[{"value":"AUTO","label":"자동 발행"},{"value":"MANUAL","label":"직접 발행"}]'::jsonb,
       NULL, NULL, '', 1, 'N'
FROM tb_tenant t
WHERE NOT EXISTS (
    SELECT 1 FROM tb_system_policy p
    WHERE p.tenant_id = t.tenant_id AND p.policy_code = 'STATEMENT_ISSUE_MODE'
);

UPDATE tb_menu SET menu_nm = '거래명세서발행'
WHERE menu_url = '/sales/delivery/statement-create' AND menu_nm = '거래명세서등록';
