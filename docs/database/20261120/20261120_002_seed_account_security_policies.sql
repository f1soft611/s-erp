-- 20261120_002 계정 보안 정책 시드(모든 테넌트) + 사진 보정
-- 정책이 없는 테넌트에만 넣으므로 재실행해도 안전하다. 새 테넌트를 SQL로 만든 뒤 다시 실행하면 그 테넌트에도 시드된다.
-- 이 스크립트는 작성 시점에 실제 DB에 적용되지 않았다.
BEGIN;

INSERT INTO tb_system_policy (
    tenant_id, policy_code, policy_nm, category_nm, policy_dc, value_type,
    value_json, options_json, min_value, max_value, unit_nm, version, system_policy_at
)
SELECT t.tenant_id, 'LOGIN_LOCK_ENABLED', '로그인 실패 잠금 사용', '계정·보안',
       '사용하면 로그인에 연속 실패한 계정을 잠그고 관리자가 해제할 때까지 로그인하지 못하게 합니다. 기본은 미사용입니다.',
       'BOOLEAN', 'false'::jsonb, '[]'::jsonb, NULL, NULL, '', 1, 'N'
FROM tb_tenant t
WHERE NOT EXISTS (
    SELECT 1 FROM tb_system_policy p WHERE p.tenant_id = t.tenant_id AND p.policy_code = 'LOGIN_LOCK_ENABLED'
);

INSERT INTO tb_system_policy (
    tenant_id, policy_code, policy_nm, category_nm, policy_dc, value_type,
    value_json, options_json, min_value, max_value, unit_nm, version, system_policy_at
)
SELECT t.tenant_id, 'LOGIN_LOCK_MAX_ATTEMPTS', '로그인 실패 잠금 기준 횟수', '계정·보안',
       '로그인 실패가 이 횟수에 도달하면 계정을 잠급니다(잠금 사용 시에만 적용, 3~10회).',
       'NUMBER', '5'::jsonb, '[]'::jsonb, 3, 10, '회', 1, 'N'
FROM tb_tenant t
WHERE NOT EXISTS (
    SELECT 1 FROM tb_system_policy p WHERE p.tenant_id = t.tenant_id AND p.policy_code = 'LOGIN_LOCK_MAX_ATTEMPTS'
);

INSERT INTO tb_system_policy (
    tenant_id, policy_code, policy_nm, category_nm, policy_dc, value_type,
    value_json, options_json, min_value, max_value, unit_nm, version, system_policy_at
)
SELECT t.tenant_id, 'PROFILE_PHOTO_EDIT_MODE', '내 정보 사진 변경', '계정·보안',
       '내 정보 관리에서 본인이 사진을 바꿀 수 있는지(SELF), 관리자만 바꿀 수 있는지(ADMIN_ONLY) 설정합니다.',
       'SELECT', '"SELF"'::jsonb,
       '[{"value":"SELF","label":"본인 변경 허용"},{"value":"ADMIN_ONLY","label":"관리자만 변경"}]'::jsonb,
       NULL, NULL, '', 1, 'N'
FROM tb_tenant t
WHERE NOT EXISTS (
    SELECT 1 FROM tb_system_policy p WHERE p.tenant_id = t.tenant_id AND p.policy_code = 'PROFILE_PHOTO_EDIT_MODE'
);

-- 사진 보정: 사원 마스터(tb_user.photo_image)가 비어 있고 계정 사진이 있으면 사원 마스터로 복사한다(덮어쓰기 없음).
UPDATE tb_user u
SET photo_image = li.profile_image,
    updated_at = now()
FROM tb_login_account li
WHERE li.login_id = u.login_id
  AND li.tenant_id = u.tenant_id
  AND u.photo_image IS NULL
  AND li.profile_image IS NOT NULL;

COMMIT;

-- 확인용 조회
-- SELECT tenant_id, policy_code, value_json FROM tb_system_policy WHERE policy_code IN ('LOGIN_LOCK_ENABLED','LOGIN_LOCK_MAX_ATTEMPTS','PROFILE_PHOTO_EDIT_MODE') ORDER BY 1, 2;
-- SELECT count(*) FILTER (WHERE photo_image IS NOT NULL) AS user_photo FROM tb_user;
