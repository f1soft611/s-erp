-- 20261120_001 롤백: 계정관리 메뉴 제거와 tb_login_account 확장 되돌리기
-- 주의: password_change_required, updated_by 값이 사라진다(변경 강제 대기 중인 계정의 표시도 사라진다). 롤백 전에 필요하면 백업한다.
BEGIN;

DELETE FROM public.tb_role_menu_permission
WHERE menu_id IN (SELECT menu_id FROM public.tb_menu WHERE tenant_id = 1 AND menu_code = 'ST_ACCOUNTS');
DELETE FROM public.tb_menu_permission
WHERE menu_id IN (SELECT menu_id FROM public.tb_menu WHERE tenant_id = 1 AND menu_code = 'ST_ACCOUNTS');
DELETE FROM public.tb_menu WHERE tenant_id = 1 AND menu_code = 'ST_ACCOUNTS';

ALTER TABLE public.tb_login_account DROP CONSTRAINT IF EXISTS ck_login_account_pwd_change_required;
ALTER TABLE public.tb_login_account
    DROP COLUMN IF EXISTS updated_by,
    DROP COLUMN IF EXISTS password_change_required;

COMMIT;
