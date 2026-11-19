-- 인사관리 2-1단계(사원등록): tb_user 확장 + 사원등록 메뉴 등록 (테넌트 1)
-- 선행: 20261119_002·003(HR 모듈, HR_INFO 그룹). 모든 신규 컬럼은 null 허용이라 기존 행·INSERT에 영향이 없다.
-- 재실행해도 중복 등록되지 않는다. 이 스크립트는 작성 시점에 실제 DB에 적용되지 않았다.
BEGIN;

ALTER TABLE public.tb_user
    ADD COLUMN IF NOT EXISTS employee_no             VARCHAR(20)  NULL,
    ADD COLUMN IF NOT EXISTS english_nm              VARCHAR(60)  NULL,
    ADD COLUMN IF NOT EXISTS position_code           VARCHAR(30)  NULL,
    ADD COLUMN IF NOT EXISTS gender_code             VARCHAR(30)  NULL,
    ADD COLUMN IF NOT EXISTS employment_type_code    VARCHAR(30)  NULL,
    ADD COLUMN IF NOT EXISTS native_type_code        VARCHAR(30)  NULL,
    ADD COLUMN IF NOT EXISTS nationality_code        VARCHAR(30)  NULL,
    ADD COLUMN IF NOT EXISTS birth_calendar_code     VARCHAR(30)  NULL,
    ADD COLUMN IF NOT EXISTS birth_dt                DATE         NULL,
    ADD COLUMN IF NOT EXISTS join_dt                 DATE         NULL,
    ADD COLUMN IF NOT EXISTS retire_dt               DATE         NULL,
    ADD COLUMN IF NOT EXISTS suspend_dt              DATE         NULL,
    ADD COLUMN IF NOT EXISTS back_dt                 DATE         NULL,
    ADD COLUMN IF NOT EXISTS work_end_dt             DATE         NULL,
    ADD COLUMN IF NOT EXISTS admission_dt            DATE         NULL,
    ADD COLUMN IF NOT EXISTS stay_from_dt            DATE         NULL,
    ADD COLUMN IF NOT EXISTS stay_to_dt              DATE         NULL,
    ADD COLUMN IF NOT EXISTS contract_from_dt        DATE         NULL,
    ADD COLUMN IF NOT EXISTS contract_to_dt          DATE         NULL,
    ADD COLUMN IF NOT EXISTS resident_no_enc         BYTEA        NULL,
    ADD COLUMN IF NOT EXISTS resident_no_key_version VARCHAR(40)  NULL,
    ADD COLUMN IF NOT EXISTS resident_no_hash        VARCHAR(64)  NULL,
    ADD COLUMN IF NOT EXISTS resident_no_masked      VARCHAR(14)  NULL,
    ADD COLUMN IF NOT EXISTS home_phone_no           VARCHAR(30)  NULL,
    ADD COLUMN IF NOT EXISTS postal_code             VARCHAR(10)  NULL,
    ADD COLUMN IF NOT EXISTS address                 VARCHAR(200) NULL,
    ADD COLUMN IF NOT EXISTS address_detail          VARCHAR(200) NULL,
    ADD COLUMN IF NOT EXISTS real_user_at            CHAR(1)      NOT NULL DEFAULT 'N',
    ADD COLUMN IF NOT EXISTS photo_image             TEXT         NULL,
    ADD COLUMN IF NOT EXISTS created_by              BIGINT       NULL,
    ADD COLUMN IF NOT EXISTS updated_by              BIGINT       NULL;

DO $constraints$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tb_user'::regclass AND conname = 'ck_user_real_user_at') THEN
        ALTER TABLE public.tb_user ADD CONSTRAINT ck_user_real_user_at CHECK (real_user_at IN ('Y', 'N'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tb_user'::regclass AND conname = 'ck_user_retire_after_join') THEN
        ALTER TABLE public.tb_user ADD CONSTRAINT ck_user_retire_after_join
            CHECK (retire_dt IS NULL OR join_dt IS NULL OR retire_dt >= join_dt);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.tb_user'::regclass AND conname = 'ck_user_back_after_suspend') THEN
        ALTER TABLE public.tb_user ADD CONSTRAINT ck_user_back_after_suspend
            CHECK (back_dt IS NULL OR suspend_dt IS NULL OR back_dt >= suspend_dt);
    END IF;
END;
$constraints$;

-- 이미 로그인 계정이 연결된 기존 사원은 실사용자(Y)로 맞춘다(사원등록에서 계정 있는 사원의 실사용자 해제를 막기 때문).
UPDATE public.tb_user SET real_user_at = 'Y' WHERE login_id IS NOT NULL AND real_user_at <> 'Y';

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_employee_no
    ON public.tb_user (tenant_id, employee_no) WHERE employee_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_resident_no_hash
    ON public.tb_user (tenant_id, resident_no_hash) WHERE resident_no_hash IS NOT NULL;

COMMENT ON COLUMN public.tb_user.employee_no IS '사번(직접 입력 또는 입사년월 YYMM + 순번 자동, 등록 후 수정 불가)';
COMMENT ON COLUMN public.tb_user.position_code IS '직위(공통코드 POSITION item_code)';
COMMENT ON COLUMN public.tb_user.nationality_code IS '국적(공통코드 COUNTRY item_code, ISO alpha-3)';
COMMENT ON COLUMN public.tb_user.suspend_dt IS '휴직일(최신 값만 보관, 이력은 인사명령 이력)';
COMMENT ON COLUMN public.tb_user.back_dt IS '복직일(최신 값만 보관)';
COMMENT ON COLUMN public.tb_user.resident_no_enc IS '주민등록번호 AES-GCM 암호문(nonce+암호문), 평문 저장 금지';
COMMENT ON COLUMN public.tb_user.resident_no_key_version IS '주민등록번호 암호화 키 버전';
COMMENT ON COLUMN public.tb_user.resident_no_hash IS '주민등록번호 HMAC-SHA256(hex), 중복 등록 검사용';
COMMENT ON COLUMN public.tb_user.resident_no_masked IS '주민등록번호 마스킹 표시값(생년월일6-성별1******). 복호화 없이 화면에 보여 주기 위한 값이며 뒷자리는 저장하지 않는다';
COMMENT ON COLUMN public.tb_user.real_user_at IS '실사용자(시스템 사용) 여부, Y이면 로그인 계정 발급 대상';
COMMENT ON COLUMN public.tb_user.photo_image IS '사원 사진(데이터 URL). 계정이 있으면 tb_login_account.profile_image에도 같이 기록';

DO $menus$
DECLARE
    v_tenant_id BIGINT := 1;
    v_module BIGINT;
    v_group BIGINT;
    v_employee BIGINT;
BEGIN
    SELECT module_id INTO STRICT v_module FROM public.tb_module WHERE tenant_id = v_tenant_id AND module_code = 'HR';
    SELECT menu_id INTO v_group FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'HR_INFO';
    IF v_group IS NULL THEN
        RAISE EXCEPTION 'HR_INFO menu group not found. Apply 20261119_002 and 20261119_003 first.';
    END IF;

    INSERT INTO public.tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, sort_order, use_at, menu_dc)
    VALUES (v_tenant_id, v_module, v_group, 'HR_INFO_EMPLOYEE', '사원등록',
            '/hr/info/employee-manage', 20, 'Y', '사원 기본 인사 정보를 등록·수정하고 재직·퇴직 현황을 조회합니다.')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;
    SELECT menu_id INTO STRICT v_employee FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'HR_INFO_EMPLOYEE';

    IF EXISTS (SELECT 1 FROM public.tb_menu WHERE menu_id = v_employee AND (
        module_id <> v_module OR parent_menu_id IS DISTINCT FROM v_group
        OR menu_url IS DISTINCT FROM '/hr/info/employee-manage' OR use_at <> 'Y')) THEN
        RAISE EXCEPTION 'Existing HR employee menu conflicts with the expected path or parent.';
    END IF;

    INSERT INTO public.tb_menu_permission (menu_id, permission_id)
    SELECT v_employee, p.permission_id FROM public.tb_permission p
    WHERE p.permission_code IN ('READ', 'CREATE', 'UPDATE', 'EXCEL') AND p.use_at = 'Y'
    ON CONFLICT (menu_id, permission_id) DO NOTHING;

    -- 역할 권한은 창고관리(CO_WAREHOUSE)의 READ/CREATE/UPDATE/EXCEL 역할 권한을 복사한다(삭제 권한 없음).
    INSERT INTO public.tb_role_menu_permission (role_id, menu_id, permission_id)
    SELECT DISTINCT rp.role_id, v_employee, rp.permission_id
    FROM public.tb_role_menu_permission rp
    JOIN public.tb_menu source ON source.menu_id = rp.menu_id AND source.tenant_id = v_tenant_id
    JOIN public.tb_role r ON r.role_id = rp.role_id AND r.tenant_id = v_tenant_id
    JOIN public.tb_permission p ON p.permission_id = rp.permission_id AND p.use_at = 'Y'
    WHERE source.menu_code = 'CO_WAREHOUSE' AND source.use_at = 'Y'
      AND p.permission_code IN ('READ', 'CREATE', 'UPDATE', 'EXCEL')
    ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;
END;
$menus$;
COMMIT;

-- 확인용 조회
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tb_user' ORDER BY ordinal_position;
-- SELECT m.menu_code, m.menu_nm, m.menu_url, p.menu_code AS parent_code FROM public.tb_menu m
--   LEFT JOIN public.tb_menu p ON p.menu_id = m.parent_menu_id WHERE m.tenant_id = 1 AND m.menu_code LIKE 'HR%' ORDER BY m.menu_id;
