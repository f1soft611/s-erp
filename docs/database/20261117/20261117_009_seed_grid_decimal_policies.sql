-- 20261117_009 모듈별 그리드 소수점 정책 시드
-- tb_module 의 사용 중 모듈마다 GRID_DECIMAL_{module_code} NUMBER 정책(기본 2, 0~6)을 생성한다.

INSERT INTO tb_system_policy (
    tenant_id, policy_code, policy_nm, category_nm, policy_dc, value_type,
    value_json, options_json, min_value, max_value, unit_nm, version, system_policy_at
)
SELECT m.tenant_id,
       'GRID_DECIMAL_' || upper(m.module_code),
       m.module_nm || ' 소수점 자릿수',
       '그리드',
       m.module_nm || ' 모듈 그리드의 수량·단가 기본 소수점 자릿수입니다.',
       'NUMBER',
       '2'::jsonb,
       '[]'::jsonb,
       0, 6, '자리', 1, 'N'
FROM tb_module m
WHERE m.use_at = 'Y'
  AND upper(m.module_code) ~ '^[A-Z0-9_]{1,66}$'
  AND NOT EXISTS (
    SELECT 1 FROM tb_system_policy p
    WHERE p.tenant_id = m.tenant_id AND p.policy_code = 'GRID_DECIMAL_' || upper(m.module_code)
);
