-- 구매자재 메뉴 그룹 재구성 (테넌트 1)
-- 구매관리(MATERIALS_PURCHASE) → 구매요청관리로 이름 변경(구매요청등록·확정·현황 유지)
-- 발주관리(MATERIALS_ORDER, /materials/order) 그룹 신설, 발주등록(MATERIALS_ORDER_CREATE)을 발주관리 아래로 이동
-- 선행: 20261112_002~004, 20261113_003. 후행: 20261113_005(발주현황, 발주관리 아래 등록)
-- 입고관리·출고관리 그룹은 해당 화면을 만들 때 함께 등록한다(빈 그룹을 먼저 만들지 않는다).
-- 메뉴 코드·URL은 바꾸지 않으므로 화면 경로와 즐겨찾기·권한은 그대로다.
-- 재실행해도 중복 등록되지 않는다. 이 스크립트는 실제 DB에 적용되지 않았다.
BEGIN;
DO $menus$
DECLARE
    v_tenant_id BIGINT := 1;
    v_module BIGINT;
    v_request_group BIGINT;
    v_order_group BIGINT;
BEGIN
    SELECT menu_id, module_id INTO STRICT v_request_group, v_module
    FROM public.tb_menu
    WHERE tenant_id = v_tenant_id AND menu_code = 'MATERIALS_PURCHASE' AND use_at = 'Y';

    UPDATE public.tb_menu
       SET menu_nm = '구매요청관리',
           menu_dc = '구매요청, 확정, 현황을 관리합니다.',
           updated_at = now()
     WHERE menu_id = v_request_group;

    INSERT INTO public.tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, sort_order, use_at, menu_dc)
    VALUES (v_tenant_id, v_module, NULL, 'MATERIALS_ORDER', '발주관리',
            '/materials/order', 20, 'Y', '발주를 등록하고 조회·수정·취소합니다.')
    ON CONFLICT (tenant_id, menu_code) DO NOTHING;
    SELECT menu_id INTO STRICT v_order_group
    FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'MATERIALS_ORDER';

    IF EXISTS (SELECT 1 FROM public.tb_menu WHERE menu_id = v_order_group AND (
        module_id <> v_module OR parent_menu_id IS NOT NULL
        OR menu_url IS DISTINCT FROM '/materials/order' OR use_at <> 'Y'
    )) THEN
        RAISE EXCEPTION 'Existing purchase order group menu conflicts with the expected path or parent.';
    END IF;

    UPDATE public.tb_menu
       SET parent_menu_id = v_order_group,
           sort_order = 10,
           updated_at = now()
     WHERE tenant_id = v_tenant_id AND menu_code = 'MATERIALS_ORDER_CREATE'
       AND parent_menu_id IS DISTINCT FROM v_order_group;
END;
$menus$;
COMMIT;

-- 확인용 조회
-- SELECT m.menu_code, m.menu_nm, p.menu_code AS parent_code, m.sort_order
--   FROM public.tb_menu m LEFT JOIN public.tb_menu p ON p.menu_id = m.parent_menu_id
--  WHERE m.tenant_id = 1 AND m.menu_code LIKE 'MATERIALS%' ORDER BY p.menu_code NULLS FIRST, m.sort_order;
