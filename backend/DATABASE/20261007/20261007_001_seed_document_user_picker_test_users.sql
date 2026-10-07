-- 대상 DB: s-erp_central (PostgreSQL)
-- 목적: 문서작성 사용자 선택기 테스트용 활성 사용자 프로필 10개 추가
-- 로그인 계정/암호는 생성하지 않고 기존 활성 계정 연결을 재사용

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.tb_user u
        JOIN public.tb_login_account la
          ON la.login_id = u.login_id
         AND la.tenant_id = u.tenant_id
         AND la.use_at = 'Y'
        WHERE u.use_at = 'Y'
    ) THEN
        RAISE EXCEPTION 'No active account-backed user is available for document picker test data';
    END IF;
END;
$$;

WITH seed_users (user_nm, email_addr) AS (
    VALUES
        ('문서작성 테스트 사용자 01', 'doc-write-test-user-01@example.invalid'),
        ('문서작성 테스트 사용자 02', 'doc-write-test-user-02@example.invalid'),
        ('문서작성 테스트 사용자 03', 'doc-write-test-user-03@example.invalid'),
        ('문서작성 테스트 사용자 04', 'doc-write-test-user-04@example.invalid'),
        ('문서작성 테스트 사용자 05', 'doc-write-test-user-05@example.invalid'),
        ('문서작성 테스트 사용자 06', 'doc-write-test-user-06@example.invalid'),
        ('문서작성 테스트 사용자 07', 'doc-write-test-user-07@example.invalid'),
        ('문서작성 테스트 사용자 08', 'doc-write-test-user-08@example.invalid'),
        ('문서작성 테스트 사용자 09', 'doc-write-test-user-09@example.invalid'),
        ('문서작성 테스트 사용자 10', 'doc-write-test-user-10@example.invalid')
),
anchor AS (
    SELECT u.tenant_id, u.login_id, u.department_id, u.level_id
    FROM public.tb_user u
    JOIN public.tb_login_account la
      ON la.login_id = u.login_id
     AND la.tenant_id = u.tenant_id
     AND la.use_at = 'Y'
    WHERE u.use_at = 'Y'
    ORDER BY u.user_id
    LIMIT 1
)
INSERT INTO public.tb_user (
    tenant_id, login_id, user_nm, email_addr, department_id, level_id, use_at
)
SELECT anchor.tenant_id, anchor.login_id, seed_users.user_nm, seed_users.email_addr,
       anchor.department_id, anchor.level_id, 'Y'
FROM anchor
CROSS JOIN seed_users
ON CONFLICT (tenant_id, email_addr) DO NOTHING;

COMMIT;
