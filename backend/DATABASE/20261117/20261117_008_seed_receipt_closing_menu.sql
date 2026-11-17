-- 매입마감처리 메뉴 등록 (테넌트 1, 구매자재 > 입고관리 그룹)
-- 선행: 20261117_002/003(입고등록·입고현황 메뉴 MATERIALS_RECEIPT_CREATE/STATUS — 그룹 MATERIALS_RECEIPT, 역할 권한 복사 원본)
-- 메뉴 권한은 READ/UPDATE/EXCEL. 역할 권한은 입고등록의 READ/UPDATE, 입고현황의 EXCEL 역할 권한을 각각 복사한다.
-- 재실행해도 중복 등록되지 않는다. 이 스크립트는 실제 DB에 적용되지 않았다.
BEGIN;
DO $menus$
DECLARE
    v_tenant_id BIGINT := 1;
    v_module BIGINT;
    v_group BIGINT;
    v_closing BIGINT;
BEGIN
    SELECT menu_id, module_id INTO STRICT v_group, v_module
    FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'MATERIALS_RECEIPT'
      AND menu_url = '/materials/receipt' AND parent_menu_id IS NULL AND use_at = 'Y';

    INSERT INTO public.tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, sort_order, use_at, menu_dc)
    VALUES (v_tenant_id, v_module, v_group, 'MATERIALS_RECEIPT_CLOSING', '매입마감처리',
            '/materials/receipt/receipt-closing', 50, 'Y', '입고 행을 마감월로 매입마감하고 해제합니다.')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;
    SELECT menu_id INTO STRICT v_closing
    FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'MATERIALS_RECEIPT_CLOSING';

    IF EXISTS (SELECT 1 FROM public.tb_menu WHERE menu_id = v_closing AND (
        module_id <> v_module OR parent_menu_id IS DISTINCT FROM v_group
        OR menu_url IS DISTINCT FROM '/materials/receipt/receipt-closing' OR use_at <> 'Y'
    )) THEN
        RAISE EXCEPTION 'Existing receipt closing menu conflicts with the expected path or parent.';
    END IF;

    INSERT INTO public.tb_menu_permission (menu_id, permission_id)
    SELECT v_closing, p.permission_id
    FROM public.tb_permission p
    WHERE p.permission_code IN ('READ', 'UPDATE', 'EXCEL') AND p.use_at = 'Y'
    ON CONFLICT (menu_id, permission_id) DO NOTHING;

    INSERT INTO public.tb_role_menu_permission (role_id, menu_id, permission_id)
    SELECT DISTINCT rp.role_id, v_closing, rp.permission_id
    FROM public.tb_role_menu_permission rp
    JOIN public.tb_menu source ON source.menu_id = rp.menu_id AND source.tenant_id = v_tenant_id
    JOIN public.tb_role r ON r.role_id = rp.role_id AND r.tenant_id = v_tenant_id
    JOIN public.tb_permission p ON p.permission_id = rp.permission_id AND p.use_at = 'Y'
    WHERE source.menu_code = 'MATERIALS_RECEIPT_CREATE' AND source.use_at = 'Y'
      AND p.permission_code IN ('READ', 'UPDATE')
    ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;

    INSERT INTO public.tb_role_menu_permission (role_id, menu_id, permission_id)
    SELECT DISTINCT rp.role_id, v_closing, rp.permission_id
    FROM public.tb_role_menu_permission rp
    JOIN public.tb_menu source ON source.menu_id = rp.menu_id AND source.tenant_id = v_tenant_id
    JOIN public.tb_role r ON r.role_id = rp.role_id AND r.tenant_id = v_tenant_id
    JOIN public.tb_permission p ON p.permission_id = rp.permission_id AND p.use_at = 'Y'
    WHERE source.menu_code = 'MATERIALS_RECEIPT_STATUS' AND source.use_at = 'Y'
      AND p.permission_code = 'EXCEL'
    ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;
END;
$menus$;
COMMIT;

-- 확인용 조회
-- SELECT m.menu_code, m.menu_nm, m.menu_url, m.sort_order, p.menu_code AS parent_code
--   FROM public.tb_menu m LEFT JOIN public.tb_menu p ON p.menu_id = m.parent_menu_id
--  WHERE m.tenant_id = 1 AND p.menu_code = 'MATERIALS_RECEIPT' ORDER BY m.sort_order;
