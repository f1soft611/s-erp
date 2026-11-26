-- 실행 전 승인된 대상 테넌트를 지정한다. 권한은 메뉴 등록 후 관리자 화면에서 부여한다.
-- 그룹웨어 > 커뮤니티(GW_INFO_CENTER) 아래에 협업공간 메뉴를 추가한다.
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
    SELECT module_id INTO STRICT v_module_id FROM tb_module
    WHERE tenant_id = v_tenant_id AND module_code = 'GROUPWARE'
      AND module_url = '/groupware' AND use_at = 'Y';
    SELECT menu_id INTO STRICT v_parent_id FROM tb_menu
    WHERE tenant_id = v_tenant_id AND module_id = v_module_id AND menu_code = 'GW_INFO_CENTER'
      AND parent_menu_id IS NULL AND menu_url = '/groupware/community' AND use_at = 'Y';
    INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, menu_dc, sort_order, use_at)
    VALUES (v_tenant_id, v_module_id, v_parent_id, 'GW_WORKSPACE', '협업공간',
        '/groupware/community/workspace',
        '협업방을 만들어 글과 댓글로 소통하고, 칸반이나 피드로 업무와 자료를 함께 관리합니다.', 44, 'Y')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;
    SELECT menu_id INTO STRICT v_menu_id FROM tb_menu
    WHERE tenant_id = v_tenant_id AND module_id = v_module_id AND parent_menu_id = v_parent_id
      AND menu_code = 'GW_WORKSPACE' AND menu_url = '/groupware/community/workspace' AND use_at = 'Y';
    INSERT INTO tb_menu_permission (menu_id, permission_id)
    SELECT v_menu_id, permission_id FROM tb_permission
    WHERE permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE') AND use_at = 'Y'
    ON CONFLICT (menu_id, permission_id) DO NOTHING;
END
$seed$;
COMMIT;
