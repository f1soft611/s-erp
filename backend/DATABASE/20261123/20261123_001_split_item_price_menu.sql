-- 20261123_001 단가등록 메뉴를 매입단가등록 / 매출단가등록으로 분리
-- 1) 기존 메뉴(menu_code CO_UPRICE)를 매입단가등록으로 바꾸고 주소를 /co/master/item-purchase-prices로 변경
-- 2) 같은 부모 아래에 매출단가등록(CO_UPRICE_SALES, /co/master/item-sales-prices)을 추가
-- 3) 기존 메뉴의 역할 권한(tb_role_menu_permission)을 새 메뉴로 복제
-- 이 스크립트는 작성 시점에 실제 DB에 적용되지 않았다. 재실행해도 안전하다(이미 있는 행은 건너뜀).
-- 모든 테넌트의 CO_UPRICE 메뉴가 대상이다.
BEGIN;

UPDATE public.tb_menu
   SET menu_nm = '매입단가등록',
       menu_url = '/co/master/item-purchase-prices',
       menu_dc = '품목·거래처별 매입 단가와 기본 거래처를 관리합니다.',
       updated_at = CURRENT_TIMESTAMP
 WHERE menu_code = 'CO_UPRICE'
   AND (menu_nm <> '매입단가등록' OR menu_url IS DISTINCT FROM '/co/master/item-purchase-prices');

INSERT INTO public.tb_menu (
    tenant_id, module_id, parent_menu_id, menu_code, menu_nm,
    menu_url, icon_nm, sort_order, use_at, menu_dc
)
SELECT p.tenant_id, p.module_id, p.parent_menu_id, 'CO_UPRICE_SALES', '매출단가등록',
       '/co/master/item-sales-prices', p.icon_nm, p.sort_order + 1, p.use_at,
       '품목·거래처별 매출 단가를 관리합니다.'
  FROM public.tb_menu p
 WHERE p.menu_code = 'CO_UPRICE'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

INSERT INTO public.tb_role_menu_permission (role_id, menu_id, permission_id)
SELECT rp.role_id, s.menu_id, rp.permission_id
  FROM public.tb_menu p
  JOIN public.tb_menu s
    ON s.tenant_id = p.tenant_id AND s.menu_code = 'CO_UPRICE_SALES'
  JOIN public.tb_role_menu_permission rp
    ON rp.menu_id = p.menu_id
 WHERE p.menu_code = 'CO_UPRICE'
ON CONFLICT DO NOTHING;

COMMIT;
