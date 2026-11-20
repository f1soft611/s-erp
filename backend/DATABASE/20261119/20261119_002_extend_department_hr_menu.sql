-- 인사관리 1단계(부서관리): tb_department 확장 + HR 모듈/부서관리 메뉴 등록 (테넌트 1)
-- 선행: 20261117_005(메뉴 시드 패턴), CO_WAREHOUSE 메뉴의 역할 권한(복사 원본)
-- 재실행해도 중복 등록되지 않는다. 이 스크립트는 실제 DB에 적용되지 않았다(작성 시점).
-- 적용 전 확인: tb_department 건수 0건이면 유일 인덱스 추가에 충돌이 없다.
BEGIN;

ALTER TABLE public.tb_department
    ADD COLUMN IF NOT EXISTS manager_user_id BIGINT NULL,
    ADD COLUMN IF NOT EXISTS department_dc   VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS created_by      BIGINT NULL,
    ADD COLUMN IF NOT EXISTS updated_by      BIGINT NULL;

DO $fk$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.tb_department'::regclass AND conname = 'fk_department_manager_user'
    ) THEN
        ALTER TABLE public.tb_department
            ADD CONSTRAINT fk_department_manager_user
            FOREIGN KEY (manager_user_id) REFERENCES public.tb_user (user_id) ON DELETE SET NULL;
    END IF;
END;
$fk$;

-- 같은 상위 부서 아래 동일 부서명 금지(사용안함 부서도 이름을 점유한다). 최상위는 NULL 비교가 안 되므로 인덱스를 둘로 나눈다.
CREATE UNIQUE INDEX IF NOT EXISTS ux_department_root_name
    ON public.tb_department (tenant_id, department_nm)
    WHERE parent_department_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_department_child_name
    ON public.tb_department (tenant_id, parent_department_id, department_nm)
    WHERE parent_department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_department_manager_user
    ON public.tb_department (manager_user_id);

COMMENT ON COLUMN public.tb_department.manager_user_id IS '부서장(tb_user.user_id)';
COMMENT ON COLUMN public.tb_department.department_dc IS '부서 설명';
COMMENT ON COLUMN public.tb_department.created_by IS '등록자(tb_user.user_id)';
COMMENT ON COLUMN public.tb_department.updated_by IS '수정자(tb_user.user_id)';

DO $menus$
DECLARE
    v_tenant_id BIGINT := 1;
    v_module BIGINT;
    v_group BIGINT;
    v_manage BIGINT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.tb_tenant WHERE tenant_id = v_tenant_id) THEN
        RAISE EXCEPTION 'Tenant % does not exist.', v_tenant_id;
    END IF;

    INSERT INTO public.tb_module (tenant_id, module_code, module_nm, icon_nm, module_url, sort_order, use_at)
    VALUES (v_tenant_id, 'HR', '인사관리', 'Business', '/hr', 6, 'Y')
    ON CONFLICT (tenant_id, module_code) DO NOTHING;
    SELECT module_id INTO STRICT v_module
    FROM public.tb_module WHERE tenant_id = v_tenant_id AND module_code = 'HR';

    IF EXISTS (SELECT 1 FROM public.tb_module WHERE module_id = v_module AND (
        module_url IS DISTINCT FROM '/hr' OR use_at <> 'Y'
    )) THEN
        RAISE EXCEPTION 'Existing HR module conflicts with the expected path.';
    END IF;

    INSERT INTO public.tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, sort_order, use_at, menu_dc)
    VALUES (v_tenant_id, v_module, NULL, 'HR_DEPARTMENT', '부서관리',
            '/hr/department', 10, 'Y', '조직의 부서 구조와 소속 사원을 관리합니다.')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;
    SELECT menu_id INTO STRICT v_group
    FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'HR_DEPARTMENT';

    INSERT INTO public.tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, sort_order, use_at, menu_dc)
    VALUES (v_tenant_id, v_module, v_group, 'HR_DEPARTMENT_MANAGE', '부서등록',
            '/hr/department/department-manage', 10, 'Y', '부서 트리를 등록·편집하고 사용안함 처리하며 소속 사원을 확인합니다.')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;
    SELECT menu_id INTO STRICT v_manage
    FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'HR_DEPARTMENT_MANAGE';

    IF EXISTS (SELECT 1 FROM public.tb_menu WHERE tenant_id = v_tenant_id AND (
        (menu_id = v_group AND (module_id <> v_module OR parent_menu_id IS NOT NULL
            OR menu_url IS DISTINCT FROM '/hr/department' OR use_at <> 'Y'))
        OR (menu_id = v_manage AND (module_id <> v_module OR parent_menu_id IS DISTINCT FROM v_group
            OR menu_url IS DISTINCT FROM '/hr/department/department-manage' OR use_at <> 'Y'))
    )) THEN
        RAISE EXCEPTION 'Existing HR department menu conflicts with the expected path or parent.';
    END IF;

    INSERT INTO public.tb_menu_permission (menu_id, permission_id)
    SELECT v_manage, p.permission_id
    FROM public.tb_permission p
    WHERE p.permission_code IN ('READ', 'CREATE', 'UPDATE') AND p.use_at = 'Y'
    ON CONFLICT (menu_id, permission_id) DO NOTHING;

    -- 역할 권한은 창고관리(CO_WAREHOUSE)의 READ/CREATE/UPDATE 역할 권한을 복사한다(삭제 권한 없음).
    INSERT INTO public.tb_role_menu_permission (role_id, menu_id, permission_id)
    SELECT DISTINCT rp.role_id, v_manage, rp.permission_id
    FROM public.tb_role_menu_permission rp
    JOIN public.tb_menu source ON source.menu_id = rp.menu_id AND source.tenant_id = v_tenant_id
    JOIN public.tb_role r ON r.role_id = rp.role_id AND r.tenant_id = v_tenant_id
    JOIN public.tb_permission p ON p.permission_id = rp.permission_id AND p.use_at = 'Y'
    WHERE source.menu_code = 'CO_WAREHOUSE' AND source.use_at = 'Y'
      AND p.permission_code IN ('READ', 'CREATE', 'UPDATE')
    ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;
END;
$menus$;
COMMIT;

-- 확인용 조회
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'tb_department' ORDER BY ordinal_position;
-- SELECT mo.module_code, m.menu_code, m.menu_nm, p.menu_code AS parent_code, m.sort_order
--   FROM public.tb_menu m JOIN public.tb_module mo ON mo.module_id = m.module_id
--   LEFT JOIN public.tb_menu p ON p.menu_id = m.parent_menu_id
--  WHERE m.tenant_id = 1 AND mo.module_code = 'HR' ORDER BY p.menu_code NULLS FIRST, m.sort_order;
