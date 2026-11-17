-- 입고현황 메뉴 등록 (테넌트 1)
-- 선행: 20261117_002_seed_material_receipt_menu.sql (입고관리 그룹 MATERIALS_RECEIPT, 입고등록)
-- 역할 권한은 가입고현황(MATERIALS_ARRIVAL_STATUS)에 부여된 READ/EXCEL 역할 권한을 복사한다.
-- 재실행해도 중복 등록되지 않는다. 이 스크립트는 실제 DB에 적용되지 않았다.
BEGIN;
DO $menus$
DECLARE
    v_tenant_id BIGINT := 1;
    v_module BIGINT;
    v_parent BIGINT;
    v_status BIGINT;
BEGIN
    SELECT menu_id, module_id INTO STRICT v_parent, v_module
    FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'MATERIALS_RECEIPT' AND use_at = 'Y';

    INSERT INTO public.tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, sort_order, use_at, menu_dc)
    VALUES (v_tenant_id, v_module, v_parent, 'MATERIALS_RECEIPT_STATUS', '입고현황',
            '/materials/receipt/receipt-status', 40, 'Y', '입고를 조회하고 수정·취소합니다.')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;
    SELECT menu_id INTO STRICT v_status
    FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'MATERIALS_RECEIPT_STATUS';

    IF EXISTS (SELECT 1 FROM public.tb_menu WHERE menu_id = v_status AND (
        module_id <> v_module OR parent_menu_id IS DISTINCT FROM v_parent
        OR menu_url IS DISTINCT FROM '/materials/receipt/receipt-status' OR use_at <> 'Y'
    )) THEN
        RAISE EXCEPTION 'Existing material receipt status menu conflicts with the expected path or parent.';
    END IF;

    INSERT INTO public.tb_menu_permission (menu_id, permission_id)
    SELECT v_status, p.permission_id
    FROM public.tb_permission p
    WHERE p.permission_code IN ('READ', 'EXCEL') AND p.use_at = 'Y'
    ON CONFLICT (menu_id, permission_id) DO NOTHING;

    INSERT INTO public.tb_role_menu_permission (role_id, menu_id, permission_id)
    SELECT DISTINCT rp.role_id, v_status, rp.permission_id
    FROM public.tb_role_menu_permission rp
    JOIN public.tb_menu source ON source.menu_id = rp.menu_id AND source.tenant_id = v_tenant_id
    JOIN public.tb_role r ON r.role_id = rp.role_id AND r.tenant_id = v_tenant_id
    JOIN public.tb_permission p ON p.permission_id = rp.permission_id AND p.use_at = 'Y'
    WHERE source.menu_code = 'MATERIALS_ARRIVAL_STATUS' AND source.use_at = 'Y'
      AND p.permission_code IN ('READ', 'EXCEL')
    ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;
END;
$menus$;
COMMIT;
