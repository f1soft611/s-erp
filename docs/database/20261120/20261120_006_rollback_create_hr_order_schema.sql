-- 20261120_006 롤백: 인사명령 메뉴와 이력 테이블 제거
-- 주의: 인사명령 이력 데이터가 모두 사라진다. 롤백 전에 필요하면 백업한다.
BEGIN;
DELETE FROM public.tb_role_menu_permission WHERE menu_id IN (SELECT menu_id FROM public.tb_menu WHERE menu_code = 'HR_INFO_ORDER');
DELETE FROM public.tb_menu_permission WHERE menu_id IN (SELECT menu_id FROM public.tb_menu WHERE menu_code = 'HR_INFO_ORDER');
DELETE FROM public.tb_menu WHERE menu_code = 'HR_INFO_ORDER';
DROP TABLE IF EXISTS public.tb_hr_order_dt;
DROP TABLE IF EXISTS public.tb_hr_order_hd;
COMMIT;
