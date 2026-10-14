-- Run this file directly with psql.
-- WARNING: psql \prompt input is visible while typed. The expanded password SQL
-- may also be recorded by PostgreSQL statement logging. Run only in a trusted
-- terminal and an approved database logging environment.
\set ON_ERROR_STOP on
\prompt 'New password for the ten test accounts (input is visible): ' reset_password

BEGIN;

CREATE TEMPORARY TABLE document_test_password_reset (
    login_code varchar(100) PRIMARY KEY,
    password_hash varchar(255)
) ON COMMIT DROP;

INSERT INTO document_test_password_reset (login_code, password_hash)
SELECT target.login_code,
       encode(
           sha256(
               convert_to(target.login_code, 'UTF8')
               || convert_to(:'reset_password', 'UTF8')
           ),
           'base64'
       )
FROM (
    VALUES
        ('doc-write-test-user-01'),
        ('doc-write-test-user-02'),
        ('doc-write-test-user-03'),
        ('doc-write-test-user-04'),
        ('doc-write-test-user-05'),
        ('doc-write-test-user-06'),
        ('doc-write-test-user-07'),
        ('doc-write-test-user-08'),
        ('doc-write-test-user-09'),
        ('doc-write-test-user-10')
) AS target(login_code)
WHERE :'reset_password' <> '';

\unset reset_password

DO $$
BEGIN
    IF (SELECT COUNT(*) FROM document_test_password_reset) <> 10
       OR EXISTS (
           SELECT 1
           FROM document_test_password_reset
           WHERE password_hash IS NULL
              OR LENGTH(password_hash) <> 44
              OR password_hash !~ '^[A-Za-z0-9+/]{43}=$'
       ) THEN
        RAISE EXCEPTION 'Ten account-specific SHA-256/Base64 hashes are required';
    END IF;

    IF (
        SELECT COUNT(*)
        FROM public.tb_tenant
        WHERE tenant_code = 'T1358606250'
          AND use_at = 'Y'
    ) <> 1 THEN
        RAISE EXCEPTION 'Expected exactly one active target tenant';
    END IF;

    IF (
        SELECT COUNT(*)
        FROM public.tb_login_account AS account
        JOIN public.tb_tenant AS tenant
          ON tenant.tenant_id = account.tenant_id
        JOIN document_test_password_reset AS target
          ON target.login_code = account.login_code
        WHERE tenant.tenant_code = 'T1358606250'
          AND tenant.use_at = 'Y'
          AND account.use_at = 'Y'
    ) <> 10 THEN
        RAISE EXCEPTION 'Expected exactly ten active target login accounts';
    END IF;

    PERFORM account.login_id
    FROM public.tb_login_account AS account
    JOIN public.tb_tenant AS tenant
      ON tenant.tenant_id = account.tenant_id
    JOIN document_test_password_reset AS target
      ON target.login_code = account.login_code
    WHERE tenant.tenant_code = 'T1358606250'
      AND tenant.use_at = 'Y'
      AND account.use_at = 'Y'
    FOR UPDATE OF account, tenant;
END;
$$;

DO $$
DECLARE
    updated_count integer;
BEGIN
    UPDATE public.tb_login_account AS account
    SET password_hash = target.password_hash,
        password_changed_at = CURRENT_TIMESTAMP,
        login_attempt_count = 0,
        locked_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    FROM public.tb_tenant AS tenant,
         document_test_password_reset AS target
    WHERE tenant.tenant_id = account.tenant_id
      AND tenant.tenant_code = 'T1358606250'
      AND tenant.use_at = 'Y'
      AND account.login_code = target.login_code
      AND account.use_at = 'Y';

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count <> 10 THEN
        RAISE EXCEPTION 'Expected to reset ten test accounts, updated %', updated_count;
    END IF;
END;
$$;

COMMIT;
