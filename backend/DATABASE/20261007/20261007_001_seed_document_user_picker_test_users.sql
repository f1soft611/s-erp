-- 대상 DB: s-erp_central (PostgreSQL)
-- 목적: 사용자 선택기 테스트 프로필 10개에 독립 로그인 계정과 DEFAULT_USER 역할 연결
-- 사전 조건: 동일 세션에서 app.document_test_user_hash_01..10을 각각 설정한다.
-- 각 값은 EgovFileScrty.encryptPassword(password, login_code)의 44자 Base64 SHA-256 결과여야 한다.
-- 평문 비밀번호 및 해시를 이 파일이나 저장소에 기록하지 않는다.

BEGIN;

CREATE TEMPORARY TABLE document_user_test_seed (
    user_no char(2) PRIMARY KEY,
    user_nm varchar(100) NOT NULL,
    email_addr varchar(100) NOT NULL UNIQUE,
    login_code varchar(100) NOT NULL UNIQUE,
    password_hash varchar(255)
) ON COMMIT DROP;

INSERT INTO document_user_test_seed (
    user_no, user_nm, email_addr, login_code, password_hash
)
VALUES
    ('01', '문서작성 테스트 사용자 01', 'doc-write-test-user-01@example.invalid',
     'doc-write-test-user-01', current_setting('app.document_test_user_hash_01', true)),
    ('02', '문서작성 테스트 사용자 02', 'doc-write-test-user-02@example.invalid',
     'doc-write-test-user-02', current_setting('app.document_test_user_hash_02', true)),
    ('03', '문서작성 테스트 사용자 03', 'doc-write-test-user-03@example.invalid',
     'doc-write-test-user-03', current_setting('app.document_test_user_hash_03', true)),
    ('04', '문서작성 테스트 사용자 04', 'doc-write-test-user-04@example.invalid',
     'doc-write-test-user-04', current_setting('app.document_test_user_hash_04', true)),
    ('05', '문서작성 테스트 사용자 05', 'doc-write-test-user-05@example.invalid',
     'doc-write-test-user-05', current_setting('app.document_test_user_hash_05', true)),
    ('06', '문서작성 테스트 사용자 06', 'doc-write-test-user-06@example.invalid',
     'doc-write-test-user-06', current_setting('app.document_test_user_hash_06', true)),
    ('07', '문서작성 테스트 사용자 07', 'doc-write-test-user-07@example.invalid',
     'doc-write-test-user-07', current_setting('app.document_test_user_hash_07', true)),
    ('08', '문서작성 테스트 사용자 08', 'doc-write-test-user-08@example.invalid',
     'doc-write-test-user-08', current_setting('app.document_test_user_hash_08', true)),
    ('09', '문서작성 테스트 사용자 09', 'doc-write-test-user-09@example.invalid',
     'doc-write-test-user-09', current_setting('app.document_test_user_hash_09', true)),
    ('10', '문서작성 테스트 사용자 10', 'doc-write-test-user-10@example.invalid',
     'doc-write-test-user-10', current_setting('app.document_test_user_hash_10', true));

DO $$
BEGIN
    IF (SELECT COUNT(*) FROM document_user_test_seed) <> 10 THEN
        RAISE EXCEPTION 'Expected exactly ten document user picker test accounts';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM document_user_test_seed
        WHERE password_hash IS NULL
           OR LENGTH(password_hash) <> 44
           OR password_hash !~ '^[A-Za-z0-9+/]{43}=$'
    ) THEN
        RAISE EXCEPTION 'All ten account-specific SHA-256/Base64 password hashes must be set in this session';
    END IF;
END;
$$;

CREATE TEMPORARY TABLE document_user_test_anchor
ON COMMIT DROP
AS
SELECT u.tenant_id, u.department_id, u.level_id
FROM public.tb_user u
JOIN public.tb_login_account la
  ON la.login_id = u.login_id
 AND la.tenant_id = u.tenant_id
 AND la.use_at = 'Y'
WHERE u.use_at = 'Y'
  AND NOT EXISTS (
      SELECT 1
      FROM document_user_test_seed s
      WHERE s.user_nm = u.user_nm
         OR s.email_addr = u.email_addr
  )
ORDER BY u.user_id
LIMIT 1;

CREATE TEMPORARY TABLE document_user_test_role
ON COMMIT DROP
AS
SELECT r.tenant_id, r.role_id
FROM public.tb_role r
JOIN document_user_test_anchor a
  ON a.tenant_id = r.tenant_id
WHERE r.role_code = 'DEFAULT_USER'
  AND r.use_at = 'Y';

DO $$
BEGIN
    IF (SELECT COUNT(*) FROM document_user_test_anchor) <> 1 THEN
        RAISE EXCEPTION 'No active non-test account-backed user is available as the tenant anchor';
    END IF;

    IF (SELECT COUNT(*) FROM document_user_test_role) <> 1 THEN
        RAISE EXCEPTION 'The anchor tenant must have exactly one active DEFAULT_USER role';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM document_user_test_anchor a
        JOIN document_user_test_seed s ON TRUE
        JOIN public.tb_user u
          ON u.tenant_id = a.tenant_id
         AND u.email_addr = s.email_addr
        WHERE u.user_nm <> s.user_nm
    ) THEN
        RAISE EXCEPTION 'A test email is already used by a non-test profile in the anchor tenant';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM document_user_test_anchor a
        JOIN document_user_test_seed s ON TRUE
        JOIN public.tb_login_account la
          ON la.tenant_id = a.tenant_id
         AND la.login_code = s.login_code
        WHERE NOT EXISTS (
            SELECT 1
            FROM public.tb_user u
            WHERE u.tenant_id = a.tenant_id
              AND u.login_id = la.login_id
              AND u.user_nm = s.user_nm
              AND u.email_addr = s.email_addr
        )
           OR EXISTS (
            SELECT 1
            FROM public.tb_user u
            WHERE u.tenant_id = a.tenant_id
              AND u.login_id = la.login_id
              AND (
                  u.user_nm IS DISTINCT FROM s.user_nm
                  OR u.email_addr IS DISTINCT FROM s.email_addr
              )
        )
    ) THEN
        RAISE EXCEPTION 'A test login code is already assigned to a different account owner in the anchor tenant';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM document_user_test_anchor a
        JOIN document_user_test_seed s ON TRUE
        JOIN public.tb_login_account la
          ON la.tenant_id = a.tenant_id
         AND la.login_code = s.login_code
        JOIN public.tb_login_account_role lar
          ON lar.login_id = la.login_id
        JOIN public.tb_role r
          ON r.role_id = lar.role_id
         AND r.tenant_id = a.tenant_id
        WHERE r.role_code <> 'DEFAULT_USER'
    ) THEN
        RAISE EXCEPTION 'A test login account has a role other than DEFAULT_USER; review it before reseeding';
    END IF;
END;
$$;

INSERT INTO public.tb_login_account (
    tenant_id, login_code, password_hash, login_attempt_count, locked_at,
    password_changed_at, use_at
)
SELECT
    a.tenant_id, s.login_code, s.password_hash, 0, NULL, CURRENT_TIMESTAMP, 'Y'
FROM document_user_test_anchor a
CROSS JOIN document_user_test_seed s
ON CONFLICT (tenant_id, login_code) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    login_attempt_count = 0,
    locked_at = NULL,
    password_changed_at = CURRENT_TIMESTAMP,
    use_at = 'Y';

INSERT INTO public.tb_login_account_role (login_id, role_id)
SELECT la.login_id, r.role_id
FROM document_user_test_anchor a
CROSS JOIN document_user_test_seed s
JOIN public.tb_login_account la
  ON la.tenant_id = a.tenant_id
 AND la.login_code = s.login_code
JOIN document_user_test_role r
  ON r.tenant_id = a.tenant_id
ON CONFLICT (login_id, role_id) DO NOTHING;

INSERT INTO public.tb_user (
    tenant_id, login_id, user_nm, email_addr, department_id, level_id, use_at
)
SELECT
    a.tenant_id, la.login_id, s.user_nm, s.email_addr,
    a.department_id, a.level_id, 'Y'
FROM document_user_test_anchor a
CROSS JOIN document_user_test_seed s
JOIN public.tb_login_account la
  ON la.tenant_id = a.tenant_id
 AND la.login_code = s.login_code
ON CONFLICT (tenant_id, email_addr) DO UPDATE
SET login_id = EXCLUDED.login_id,
    user_nm = EXCLUDED.user_nm,
    department_id = EXCLUDED.department_id,
    level_id = EXCLUDED.level_id,
    use_at = 'Y';

DO $$
BEGIN
    IF (
        SELECT COUNT(DISTINCT u.login_id)
        FROM document_user_test_anchor a
        JOIN document_user_test_seed s ON TRUE
        JOIN public.tb_user u
          ON u.tenant_id = a.tenant_id
         AND u.email_addr = s.email_addr
         AND u.user_nm = s.user_nm
         AND u.use_at = 'Y'
        JOIN public.tb_login_account la
          ON la.login_id = u.login_id
         AND la.tenant_id = u.tenant_id
         AND la.login_code = s.login_code
         AND la.use_at = 'Y'
        JOIN public.tb_login_account_role lar
          ON lar.login_id = la.login_id
        JOIN document_user_test_role r
          ON r.role_id = lar.role_id
         AND r.tenant_id = la.tenant_id
    ) <> 10 THEN
        RAISE EXCEPTION 'Post-seed validation failed: expected ten uniquely linked active DEFAULT_USER accounts';
    END IF;
END;
$$;

COMMIT;
