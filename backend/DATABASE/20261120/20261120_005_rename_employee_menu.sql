-- 20261120_005 사원등록 메뉴 이름을 사원관리로 변경 (menu_code HR_INFO_EMPLOYEE, URL은 그대로)
-- 이 스크립트는 작성 시점에 실제 DB에 적용되지 않았다. 재실행해도 안전하다.
BEGIN;

UPDATE public.tb_menu
   SET menu_nm = '사원관리',
       menu_dc = '사원 기본 인사 정보를 등록·수정하고 재직·퇴직 현황을 조회합니다.',
       updated_at = CURRENT_TIMESTAMP
 WHERE menu_code = 'HR_INFO_EMPLOYEE'
   AND menu_nm <> '사원관리';

COMMIT;
