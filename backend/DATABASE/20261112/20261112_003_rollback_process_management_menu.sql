-- 대상 테넌트와 메뉴 소유권을 확인한 후 명시적으로 승인한다.
-- 기존 모듈, 상위 메뉴, 권한 및 데이터는 삭제하지 않는다.
BEGIN;
DO $rollback$
DECLARE
    v_tenant_id BIGINT := NULL;
    v_approved BOOLEAN := FALSE;
BEGIN
    IF v_tenant_id IS NULL OR NOT v_approved THEN
        RAISE EXCEPTION 'Set the approved target tenant and confirm menu ownership.';
    END IF;
    UPDATE tb_menu
    SET use_at = 'N', updated_at = CURRENT_TIMESTAMP
    WHERE tenant_id = v_tenant_id AND menu_code = 'PR_PROCESS'
      AND menu_url = '/pr/master/process-management';
END
$rollback$;
COMMIT;
