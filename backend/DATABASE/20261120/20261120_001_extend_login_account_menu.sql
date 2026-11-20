-- 인사관리 2-2단계(계정관리): tb_login_account 확장 + 계정관리 메뉴 등록 (테넌트 1)
-- 선행: 시스템 관리 메뉴(ST_SYSTEM, ST_ROLES). 신규 컬럼은 기본값이 있어 기존 행·INSERT에 영향이 없다.
-- 재실행해도 중복 등록되지 않는다. 이 스크립트는 작성 시점에 실제 DB에 적용되지 않았다.
BEGIN;

ALTER TABLE public.tb_login_account
    ADD COLUMN IF NOT EXISTS password_change_required CHAR(1) NOT NULL DEFAULT 'N',
    ADD COLUMN IF NOT EXISTS updated_by               BIGINT  NULL;

DO $constraints$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tb_login_account'::regclass AND conname = 'ck_login_account_pwd_change_required') THEN
        ALTER TABLE public.tb_login_account
            ADD CONSTRAINT ck_login_account_pwd_change_required CHECK (password_change_required IN ('Y', 'N'));
    END IF;
END;
$constraints$;

COMMENT ON COLUMN public.tb_login_account.password_change_required IS '최초 로그인 시 비밀번호 변경 강제 여부(Y이면 변경 전까지 비밀번호 변경 외 API 사용 불가). 관리자 초기화·사원등록 계정 발급이 Y로 설정';
COMMENT ON COLUMN public.tb_login_account.updated_by IS '관리자 처리(허용/미허용·초기화·잠금 해제·역할 변경)를 한 사용자(tb_user.user_id)';

DO $menus$
DECLARE
    v_tenant_id BIGINT := 1;
    v_module BIGINT;
    v_group BIGINT;
    v_accounts BIGINT;
    v_roles BIGINT;
BEGIN
    SELECT menu_id, module_id INTO v_group, v_module FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'ST_SYSTEM';
    IF v_group IS NULL THEN
        RAISE EXCEPTION 'ST_SYSTEM menu group not found.';
    END IF;
    SELECT menu_id INTO v_roles FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'ST_ROLES';
    IF v_roles IS NULL THEN
        RAISE EXCEPTION 'ST_ROLES menu not found.';
    END IF;

    INSERT INTO public.tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, sort_order, use_at, menu_dc)
    VALUES (v_tenant_id, v_module, v_group, 'ST_ACCOUNTS', '계정관리',
            '/settings/system/accounts', 25, 'Y', '발급된 로그인 계정의 허용/미허용, 비밀번호 초기화, 잠금 해제, 권한을 관리합니다.')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;
    SELECT menu_id INTO STRICT v_accounts FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'ST_ACCOUNTS';

    IF EXISTS (SELECT 1 FROM public.tb_menu WHERE menu_id = v_accounts AND (
        module_id <> v_module OR parent_menu_id IS DISTINCT FROM v_group
        OR menu_url IS DISTINCT FROM '/settings/system/accounts' OR use_at <> 'Y')) THEN
        RAISE EXCEPTION 'Existing ST_ACCOUNTS menu conflicts with the expected path or parent.';
    END IF;

    -- 메뉴 권한과 역할 권한은 권한관리(ST_ROLES)와 같게 복사한다.
    INSERT INTO public.tb_menu_permission (menu_id, permission_id)
    SELECT v_accounts, mp.permission_id FROM public.tb_menu_permission mp WHERE mp.menu_id = v_roles
    ON CONFLICT (menu_id, permission_id) DO NOTHING;

    INSERT INTO public.tb_role_menu_permission (role_id, menu_id, permission_id)
    SELECT rp.role_id, v_accounts, rp.permission_id
    FROM public.tb_role_menu_permission rp
    JOIN public.tb_role r ON r.role_id = rp.role_id AND r.tenant_id = v_tenant_id
    WHERE rp.menu_id = v_roles
    ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;
END;
$menus$;
COMMIT;

-- 확인용 조회
-- SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'tb_login_account' ORDER BY ordinal_position;
-- SELECT menu_code, menu_nm, menu_url, sort_order FROM public.tb_menu WHERE tenant_id = 1 AND menu_code IN ('ST_ROLES', 'ST_ACCOUNTS');
