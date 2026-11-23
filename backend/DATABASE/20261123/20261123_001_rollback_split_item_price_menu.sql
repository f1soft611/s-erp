-- 20261123_001 롤백: 매출단가등록 메뉴를 삭제하고 매입단가등록을 원래 단가 메뉴로 되돌린다.
-- 매출단가등록 메뉴에 즐겨찾기가 남아 있으면 중단한다(사용자 데이터 보호). 코드(화면 키)도 함께 되돌려야 한다.
BEGIN;

DO $rollback_item_price_menu$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM public.tb_user_menu_favorite f
          JOIN public.tb_menu m ON m.menu_id = f.menu_id
         WHERE m.menu_code = 'CO_UPRICE_SALES'
    ) THEN
        RAISE EXCEPTION '매출단가등록 메뉴에 즐겨찾기가 있어 롤백을 중단합니다.';
    END IF;
END
$rollback_item_price_menu$;

DELETE FROM public.tb_role_menu_permission
 WHERE menu_id IN (SELECT menu_id FROM public.tb_menu WHERE menu_code = 'CO_UPRICE_SALES');

DELETE FROM public.tb_menu WHERE menu_code = 'CO_UPRICE_SALES';

UPDATE public.tb_menu
   SET menu_nm = '품목/거래처별 단가',
       menu_url = '/co/master/item-partner-prices',
       menu_dc = NULL,
       updated_at = CURRENT_TIMESTAMP
 WHERE menu_code = 'CO_UPRICE'
   AND menu_url = '/co/master/item-purchase-prices';

COMMIT;
