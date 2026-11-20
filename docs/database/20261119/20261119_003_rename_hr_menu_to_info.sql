-- 인사관리 메뉴를 그룹 "인사정보" 하나로 통합: 20261119_002로 적용된 메뉴를 제자리에서 이름·코드·URL 변경 (테넌트 1)
--   HR_DEPARTMENT        부서관리 /hr/department                    -> HR_INFO            인사정보 /hr/info
--   HR_DEPARTMENT_MANAGE 부서등록 /hr/department/department-manage  -> HR_INFO_DEPARTMENT 부서관리 /hr/info/department-manage
-- 메뉴 ID는 그대로이므로 tb_menu_permission, tb_role_menu_permission(역할 권한)은 영향이 없다.
-- 재실행해도 안전하다(이미 바뀐 상태면 아무것도 하지 않는다). 선행: 20261119_002
BEGIN;
DO $rename$
DECLARE
    v_tenant_id BIGINT := 1;
    v_old_group BIGINT;
    v_old_screen BIGINT;
    v_new_exists INT;
BEGIN
    SELECT menu_id INTO v_old_group FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'HR_DEPARTMENT';
    SELECT menu_id INTO v_old_screen FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'HR_DEPARTMENT_MANAGE';

    IF v_old_group IS NULL AND v_old_screen IS NULL THEN
        RAISE NOTICE 'Old HR department menus not found. Nothing to rename.';
        RETURN;
    END IF;
    IF v_old_group IS NULL OR v_old_screen IS NULL THEN
        RAISE EXCEPTION 'Only one of the old HR department menus exists. Check tb_menu manually.';
    END IF;

    SELECT COUNT(*) INTO v_new_exists FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code IN ('HR_INFO', 'HR_INFO_DEPARTMENT');
    IF v_new_exists > 0 THEN
        RAISE EXCEPTION 'HR_INFO menus already exist. Resolve duplicates before renaming.';
    END IF;

    UPDATE public.tb_menu
    SET menu_code = 'HR_INFO', menu_nm = '인사정보', menu_url = '/hr/info',
        menu_dc = '부서, 사원, 인사명령 등 인사 기본 정보를 관리합니다.'
    WHERE menu_id = v_old_group AND tenant_id = v_tenant_id;

    UPDATE public.tb_menu
    SET menu_code = 'HR_INFO_DEPARTMENT', menu_nm = '부서관리', menu_url = '/hr/info/department-manage',
        menu_dc = '부서 트리를 등록·편집하고 사용안함 처리하며 소속 사원을 확인합니다.'
    WHERE menu_id = v_old_screen AND tenant_id = v_tenant_id AND parent_menu_id = v_old_group;
END;
$rename$;
COMMIT;

-- 확인용 조회
-- SELECT menu_id, menu_code, menu_nm, menu_url, parent_menu_id FROM public.tb_menu
--  WHERE tenant_id = 1 AND menu_code LIKE 'HR%' ORDER BY menu_id;
