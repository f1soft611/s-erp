-- 20261119_002 롤백: HR 부서관리 메뉴/모듈 제거와 tb_department 확장 되돌리기
-- 주의: 부서 데이터에 부서장·설명·감사정보가 입력된 뒤 롤백하면 해당 값이 사라진다. 부서 행 자체는 유지된다.
BEGIN;

DELETE FROM public.tb_role_menu_permission
WHERE menu_id IN (SELECT menu_id FROM public.tb_menu WHERE tenant_id = 1 AND menu_code IN ('HR_DEPARTMENT_MANAGE', 'HR_DEPARTMENT'));
DELETE FROM public.tb_menu_permission
WHERE menu_id IN (SELECT menu_id FROM public.tb_menu WHERE tenant_id = 1 AND menu_code IN ('HR_DEPARTMENT_MANAGE', 'HR_DEPARTMENT'));
DELETE FROM public.tb_menu WHERE tenant_id = 1 AND menu_code = 'HR_DEPARTMENT_MANAGE';
DELETE FROM public.tb_menu WHERE tenant_id = 1 AND menu_code = 'HR_DEPARTMENT';
-- HR 모듈은 다른 HR 메뉴가 남아 있지 않을 때만 제거한다.
DELETE FROM public.tb_module m
WHERE m.tenant_id = 1 AND m.module_code = 'HR'
  AND NOT EXISTS (SELECT 1 FROM public.tb_menu x WHERE x.module_id = m.module_id);

DROP INDEX IF EXISTS public.idx_department_manager_user;
DROP INDEX IF EXISTS public.ux_department_child_name;
DROP INDEX IF EXISTS public.ux_department_root_name;
ALTER TABLE public.tb_department DROP CONSTRAINT IF EXISTS fk_department_manager_user;
ALTER TABLE public.tb_department
    DROP COLUMN IF EXISTS updated_by,
    DROP COLUMN IF EXISTS created_by,
    DROP COLUMN IF EXISTS department_dc,
    DROP COLUMN IF EXISTS manager_user_id;

COMMIT;
