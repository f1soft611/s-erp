-- 발주등록 메뉴 등록 (테넌트 1)
-- 선행: 20261112_002_seed_purchase_request_menu.sql (MATERIALS 모듈, MATERIALS_PURCHASE 메뉴)
-- 참고: 이후 20261113_004가 발주등록을 발주관리 그룹 아래로 옮기므로, 이동한 뒤 재실행해도 오류가 나지 않도록 부모 일치 검사는 하지 않는다.
-- 역할 권한은 수주등록(ORDER_CREATE)에 부여된 READ/UPDATE 역할 권한을 복사한다.
-- 재실행해도 중복 등록되지 않는다. 이 스크립트는 실제 DB에 적용되지 않았다.
BEGIN;
DO $menus$
DECLARE
    v_tenant_id BIGINT := 1;
    v_module BIGINT;
    v_parent BIGINT;
    v_order BIGINT;
BEGIN
    SELECT menu_id, module_id INTO STRICT v_parent, v_module
    FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'MATERIALS_PURCHASE' AND use_at = 'Y';

    INSERT INTO public.tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, sort_order, use_at, menu_dc)
    VALUES (v_tenant_id, v_module, v_parent, 'MATERIALS_ORDER_CREATE', '발주등록',
            '/materials/order/order-create', 30, 'Y', '확정된 구매요청 품목을 불러오거나 품목을 직접 골라 발주서를 등록합니다.')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;
    SELECT menu_id INTO STRICT v_order
    FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'MATERIALS_ORDER_CREATE';

    IF EXISTS (SELECT 1 FROM public.tb_menu WHERE menu_id = v_order AND (
        module_id <> v_module
        OR menu_url IS DISTINCT FROM '/materials/order/order-create' OR use_at <> 'Y'
    )) THEN
        RAISE EXCEPTION 'Existing purchase order create menu conflicts with the expected path or parent.';
    END IF;

    INSERT INTO public.tb_menu_permission (menu_id, permission_id)
    SELECT v_order, p.permission_id
    FROM public.tb_permission p
    WHERE p.permission_code IN ('READ', 'UPDATE') AND p.use_at = 'Y'
    ON CONFLICT (menu_id, permission_id) DO NOTHING;

    INSERT INTO public.tb_role_menu_permission (role_id, menu_id, permission_id)
    SELECT DISTINCT rp.role_id, v_order, rp.permission_id
    FROM public.tb_role_menu_permission rp
    JOIN public.tb_menu source ON source.menu_id = rp.menu_id AND source.tenant_id = v_tenant_id
    JOIN public.tb_role r ON r.role_id = rp.role_id AND r.tenant_id = v_tenant_id
    JOIN public.tb_permission p ON p.permission_id = rp.permission_id AND p.use_at = 'Y'
    WHERE source.menu_code = 'ORDER_CREATE' AND source.use_at = 'Y'
      AND p.permission_code IN ('READ', 'UPDATE')
    ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;
END;
$menus$;
COMMIT;
