-- 20261109_006_company_info_rollback.sql
-- 주의: 실행 전 추가된 다섯 컬럼의 데이터를 백업한다.
BEGIN;

ALTER TABLE public.tb_tenant
    DROP COLUMN IF EXISTS facsimile_no,
    DROP COLUMN IF EXISTS telephone_no,
    DROP COLUMN IF EXISTS address,
    DROP COLUMN IF EXISTS post_code,
    DROP COLUMN IF EXISTS president_name;

COMMIT;
