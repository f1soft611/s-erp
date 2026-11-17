-- 입고관리 그룹과 가입고등록 메뉴 등록 (테넌트 1)
-- 선행: 20261113_004_restructure_materials_menu_groups.sql (구매자재 모듈 MATERIALS 메뉴 구성)
-- 입고관리(MATERIALS_RECEIPT, /materials/receipt) 그룹은 첫 화면인 가입고등록과 함께 등록한다(빈 그룹을 먼저 만들지 않는다).
-- 역할 권한은 수주등록(ORDER_CREATE)에 부여된 READ/UPDATE 역할 권한을 복사한다(20261113_003과 같음).
-- 재실행해도 중복 등록되지 않는다. 이 스크립트는 실제 DB에 적용되지 않았다.
BEGIN;
DO $menus$
DECLARE
    v_tenant_id BIGINT := 1;
    v_module BIGINT;
    v_group BIGINT;
    v_arrival BIGINT;
BEGIN
    SELECT module_id INTO STRICT v_module
    FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'MATERIALS_ORDER' AND use_at = 'Y';

    INSERT INTO public.tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, sort_order, use_at, menu_dc)
    VALUES (v_tenant_id, v_module, NULL, 'MATERIALS_RECEIPT', '입고관리',
            '/materials/receipt', 30, 'Y', '가입고와 입고를 등록하고 조회·수정합니다.')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;
    SELECT menu_id INTO STRICT v_group
    FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'MATERIALS_RECEIPT';

    IF EXISTS (SELECT 1 FROM public.tb_menu WHERE menu_id = v_group AND (
        module_id <> v_module OR parent_menu_id IS NOT NULL
        OR menu_url IS DISTINCT FROM '/materials/receipt' OR use_at <> 'Y'
    )) THEN
        RAISE EXCEPTION 'Existing receipt group menu conflicts with the expected path or parent.';
    END IF;

    INSERT INTO public.tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, sort_order, use_at, menu_dc)
    VALUES (v_tenant_id, v_module, v_group, 'MATERIALS_ARRIVAL_CREATE', '가입고등록',
            '/materials/arrival/arrival-create', 10, 'Y', '발주 잔량을 불러와 가입고를 등록합니다.')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;
    SELECT menu_id INTO STRICT v_arrival
    FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'MATERIALS_ARRIVAL_CREATE';

    IF EXISTS (SELECT 1 FROM public.tb_menu WHERE menu_id = v_arrival AND (
        module_id <> v_module OR parent_menu_id IS DISTINCT FROM v_group
        OR menu_url IS DISTINCT FROM '/materials/arrival/arrival-create' OR use_at <> 'Y'
    )) THEN
        RAISE EXCEPTION 'Existing material arrival create menu conflicts with the expected path or parent.';
    END IF;

    INSERT INTO public.tb_menu_permission (menu_id, permission_id)
    SELECT v_arrival, p.permission_id
    FROM public.tb_permission p
    WHERE p.permission_code IN ('READ', 'UPDATE') AND p.use_at = 'Y'
    ON CONFLICT (menu_id, permission_id) DO NOTHING;

    INSERT INTO public.tb_role_menu_permission (role_id, menu_id, permission_id)
    SELECT DISTINCT rp.role_id, v_arrival, rp.permission_id
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

-- 확인용 조회
-- SELECT m.menu_code, m.menu_nm, p.menu_code AS parent_code, m.sort_order
--   FROM public.tb_menu m LEFT JOIN public.tb_menu p ON p.menu_id = m.parent_menu_id
--  WHERE m.tenant_id = 1 AND m.menu_code LIKE 'MATERIALS%' ORDER BY p.menu_code NULLS FIRST, m.sort_order;
