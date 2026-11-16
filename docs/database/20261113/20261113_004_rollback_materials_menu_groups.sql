-- 구매자재 메뉴 그룹 재구성 롤백 (테넌트 1)
-- 발주등록을 구매관리 아래로 되돌리고, 발주관리 그룹은 하위 메뉴가 남아 있지 않을 때만 삭제한다.
-- 발주현황(20261113_005)이 이미 발주관리 아래에 있으면 먼저 005 롤백을 실행한다.
BEGIN;
DO $rollback$
DECLARE
    v_tenant_id BIGINT := 1;
    v_request_group BIGINT;
BEGIN
    SELECT menu_id INTO v_request_group
    FROM public.tb_menu WHERE tenant_id = v_tenant_id AND menu_code = 'MATERIALS_PURCHASE';

    UPDATE public.tb_menu
       SET parent_menu_id = v_request_group, sort_order = 30, updated_at = now()
     WHERE tenant_id = v_tenant_id AND menu_code = 'MATERIALS_ORDER_CREATE' AND v_request_group IS NOT NULL;

    DELETE FROM public.tb_menu grp
     WHERE grp.tenant_id = v_tenant_id AND grp.menu_code = 'MATERIALS_ORDER'
       AND NOT EXISTS (SELECT 1 FROM public.tb_menu child WHERE child.parent_menu_id = grp.menu_id);

    UPDATE public.tb_menu
       SET menu_nm = '구매관리', menu_dc = '구매요청과 확정을 관리합니다.', updated_at = now()
     WHERE tenant_id = v_tenant_id AND menu_code = 'MATERIALS_PURCHASE';
END;
$rollback$;
COMMIT;
