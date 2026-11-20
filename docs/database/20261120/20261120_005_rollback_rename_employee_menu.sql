-- 20261120_005 롤백: 사원관리 메뉴 이름을 사원등록으로 되돌린다.
BEGIN;
UPDATE public.tb_menu
   SET menu_nm = '사원등록',
       updated_at = CURRENT_TIMESTAMP
 WHERE menu_code = 'HR_INFO_EMPLOYEE'
   AND menu_nm = '사원관리';
COMMIT;
