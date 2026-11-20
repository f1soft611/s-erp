-- 20261119_004 롤백: 사원등록 메뉴 제거와 tb_user 확장 되돌리기
-- 주의: 사번·주민등록번호 암호문·사진 등 사원등록으로 입력된 값이 모두 사라진다(기본 컬럼은 유지). 롤백 전에 필요하면 백업한다.
BEGIN;

DELETE FROM public.tb_role_menu_permission
WHERE menu_id IN (SELECT menu_id FROM public.tb_menu WHERE tenant_id = 1 AND menu_code = 'HR_INFO_EMPLOYEE');
DELETE FROM public.tb_menu_permission
WHERE menu_id IN (SELECT menu_id FROM public.tb_menu WHERE tenant_id = 1 AND menu_code = 'HR_INFO_EMPLOYEE');
DELETE FROM public.tb_menu WHERE tenant_id = 1 AND menu_code = 'HR_INFO_EMPLOYEE';

DROP INDEX IF EXISTS public.ux_user_resident_no_hash;
DROP INDEX IF EXISTS public.ux_user_employee_no;
ALTER TABLE public.tb_user DROP CONSTRAINT IF EXISTS ck_user_back_after_suspend;
ALTER TABLE public.tb_user DROP CONSTRAINT IF EXISTS ck_user_retire_after_join;
ALTER TABLE public.tb_user DROP CONSTRAINT IF EXISTS ck_user_real_user_at;

ALTER TABLE public.tb_user
    DROP COLUMN IF EXISTS updated_by,
    DROP COLUMN IF EXISTS created_by,
    DROP COLUMN IF EXISTS photo_image,
    DROP COLUMN IF EXISTS real_user_at,
    DROP COLUMN IF EXISTS address_detail,
    DROP COLUMN IF EXISTS address,
    DROP COLUMN IF EXISTS postal_code,
    DROP COLUMN IF EXISTS home_phone_no,
    DROP COLUMN IF EXISTS resident_no_masked,
    DROP COLUMN IF EXISTS resident_no_hash,
    DROP COLUMN IF EXISTS resident_no_key_version,
    DROP COLUMN IF EXISTS resident_no_enc,
    DROP COLUMN IF EXISTS contract_to_dt,
    DROP COLUMN IF EXISTS contract_from_dt,
    DROP COLUMN IF EXISTS stay_to_dt,
    DROP COLUMN IF EXISTS stay_from_dt,
    DROP COLUMN IF EXISTS admission_dt,
    DROP COLUMN IF EXISTS work_end_dt,
    DROP COLUMN IF EXISTS back_dt,
    DROP COLUMN IF EXISTS suspend_dt,
    DROP COLUMN IF EXISTS retire_dt,
    DROP COLUMN IF EXISTS join_dt,
    DROP COLUMN IF EXISTS birth_dt,
    DROP COLUMN IF EXISTS birth_calendar_code,
    DROP COLUMN IF EXISTS nationality_code,
    DROP COLUMN IF EXISTS native_type_code,
    DROP COLUMN IF EXISTS employment_type_code,
    DROP COLUMN IF EXISTS gender_code,
    DROP COLUMN IF EXISTS position_code,
    DROP COLUMN IF EXISTS english_nm,
    DROP COLUMN IF EXISTS employee_no;

COMMIT;
