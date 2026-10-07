-- 목적: 문서작성 사용자 선택기 테스트 프로필만 제거

BEGIN;

WITH seed (user_nm, email_addr) AS (
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
anchor_tenant AS (
    SELECT u.tenant_id
    FROM public.tb_user u
    JOIN seed ON seed.user_nm = u.user_nm
             AND seed.email_addr = u.email_addr
    ORDER BY u.user_id
    LIMIT 1
)
DELETE FROM public.tb_user u
USING seed, anchor_tenant
WHERE u.user_nm = seed.user_nm
  AND u.email_addr = seed.email_addr
  AND u.tenant_id = anchor_tenant.tenant_id;

COMMIT;
