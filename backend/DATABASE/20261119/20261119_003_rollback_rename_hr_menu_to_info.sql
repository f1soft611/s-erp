-- 20261119_003 롤백: 인사정보 메뉴 이름을 20261119_002 직후 상태로 되돌린다.
-- 20261119_002를 롤백하려면 이 스크립트를 먼저 실행해야 한다(002 롤백은 옛 메뉴 코드로 삭제한다).
BEGIN;
UPDATE public.tb_menu
SET menu_code = 'HR_DEPARTMENT', menu_nm = '부서관리', menu_url = '/hr/department',
    menu_dc = '조직의 부서 구조와 소속 사원을 관리합니다.'
WHERE tenant_id = 1 AND menu_code = 'HR_INFO';
UPDATE public.tb_menu
SET menu_code = 'HR_DEPARTMENT_MANAGE', menu_nm = '부서등록', menu_url = '/hr/department/department-manage',
    menu_dc = '부서 트리를 등록·편집하고 사용안함 처리하며 소속 사원을 확인합니다.'
WHERE tenant_id = 1 AND menu_code = 'HR_INFO_DEPARTMENT';
COMMIT;
