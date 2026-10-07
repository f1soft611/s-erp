-- 목적: 문서작성 사용자 선택기 테스트 프로필과 참조되지 않는 전용 계정만 제거

BEGIN;

CREATE TEMPORARY TABLE document_user_test_seed (
    user_no char(2) PRIMARY KEY,
    user_nm varchar(100) NOT NULL,
    email_addr varchar(100) NOT NULL UNIQUE,
    login_code varchar(100) NOT NULL UNIQUE
) ON COMMIT DROP;

INSERT INTO document_user_test_seed (user_no, user_nm, email_addr, login_code)
VALUES
    ('01', '문서작성 테스트 사용자 01', 'doc-write-test-user-01@example.invalid', 'doc-write-test-user-01'),
    ('02', '문서작성 테스트 사용자 02', 'doc-write-test-user-02@example.invalid', 'doc-write-test-user-02'),
    ('03', '문서작성 테스트 사용자 03', 'doc-write-test-user-03@example.invalid', 'doc-write-test-user-03'),
    ('04', '문서작성 테스트 사용자 04', 'doc-write-test-user-04@example.invalid', 'doc-write-test-user-04'),
    ('05', '문서작성 테스트 사용자 05', 'doc-write-test-user-05@example.invalid', 'doc-write-test-user-05'),
    ('06', '문서작성 테스트 사용자 06', 'doc-write-test-user-06@example.invalid', 'doc-write-test-user-06'),
    ('07', '문서작성 테스트 사용자 07', 'doc-write-test-user-07@example.invalid', 'doc-write-test-user-07'),
    ('08', '문서작성 테스트 사용자 08', 'doc-write-test-user-08@example.invalid', 'doc-write-test-user-08'),
    ('09', '문서작성 테스트 사용자 09', 'doc-write-test-user-09@example.invalid', 'doc-write-test-user-09'),
    ('10', '문서작성 테스트 사용자 10', 'doc-write-test-user-10@example.invalid', 'doc-write-test-user-10');

CREATE TEMPORARY TABLE document_user_test_profiles
ON COMMIT DROP
AS
SELECT u.user_id, u.tenant_id, u.login_id, s.login_code
FROM public.tb_user u
JOIN document_user_test_seed s
  ON s.user_nm = u.user_nm
 AND s.email_addr = u.email_addr;

DO $$
BEGIN
    IF (
        SELECT COUNT(DISTINCT tenant_id)
        FROM document_user_test_profiles
    ) > 1 THEN
        RAISE EXCEPTION 'Test profiles span multiple tenants; refusing broad rollback';
    END IF;
END;
$$;

DELETE FROM public.tb_user u
USING document_user_test_profiles p
WHERE u.user_id = p.user_id
  AND u.tenant_id = p.tenant_id;

DELETE FROM public.tb_login_account_role lar
USING public.tb_login_account la, document_user_test_profiles p
WHERE la.login_id = p.login_id
  AND la.tenant_id = p.tenant_id
  AND la.login_code = p.login_code
  AND lar.login_id = la.login_id
  AND NOT EXISTS (
      SELECT 1
      FROM public.tb_user remaining_user
      WHERE remaining_user.login_id = la.login_id
  );

DELETE FROM public.tb_login_account la
USING document_user_test_profiles p
WHERE la.login_id = p.login_id
  AND la.tenant_id = p.tenant_id
  AND la.login_code = p.login_code
  AND NOT EXISTS (
      SELECT 1
      FROM public.tb_user remaining_user
      WHERE remaining_user.login_id = la.login_id
  );

COMMIT;
