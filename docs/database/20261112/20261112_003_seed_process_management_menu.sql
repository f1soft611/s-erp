-- 실행 전 승인된 대상 테넌트를 지정한다. 권한은 메뉴 등록 후 관리자 화면에서 부여한다.
BEGIN;
DO $seed$
DECLARE
    v_tenant_id BIGINT := NULL;
    v_module_id BIGINT;
    v_parent_id BIGINT;
    v_menu_id BIGINT;
BEGIN
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Set the approved target tenant ID.';
    END IF;
    INSERT INTO tb_module (tenant_id, module_code, module_nm, icon_nm, module_url, sort_order, use_at)
    VALUES (v_tenant_id, 'PRODUCTION', '생산관리', 'Build', '/pr', 30, 'Y')
    ON CONFLICT (tenant_id, module_code) DO NOTHING;
    SELECT module_id INTO STRICT v_module_id FROM tb_module
    WHERE tenant_id = v_tenant_id AND module_code = 'PRODUCTION'
      AND module_url = '/pr' AND use_at = 'Y';
    INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, sort_order, use_at)
    VALUES (v_tenant_id, v_module_id, NULL, 'PR_MASTER', '기준정보', '/pr/master', 10, 'Y')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;
    SELECT menu_id INTO STRICT v_parent_id FROM tb_menu
    WHERE tenant_id = v_tenant_id AND module_id = v_module_id AND menu_code = 'PR_MASTER'
      AND parent_menu_id IS NULL AND menu_url = '/pr/master' AND use_at = 'Y';
    INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, menu_dc, sort_order, use_at)
    VALUES (v_tenant_id, v_module_id, v_parent_id, 'PR_PROCESS', '공정관리',
        '/pr/master/process-management', '공정그룹과 공정을 관리합니다.', 10, 'Y')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;
    SELECT menu_id INTO STRICT v_menu_id FROM tb_menu
    WHERE tenant_id = v_tenant_id AND module_id = v_module_id AND parent_menu_id = v_parent_id
      AND menu_code = 'PR_PROCESS' AND menu_url = '/pr/master/process-management' AND use_at = 'Y';
    INSERT INTO tb_menu_permission (menu_id, permission_id)
    SELECT v_menu_id, permission_id FROM tb_permission
    WHERE permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE') AND use_at = 'Y'
    ON CONFLICT (menu_id, permission_id) DO NOTHING;
END
$seed$;
COMMIT;
