-- 20261105_002_rollback.sql
-- 주의: '창고관리'(CO_WAREHOUSE) 메뉴와 그 권한 매핑이 삭제됩니다.
--       tb_menu 삭제 시 FK ON DELETE CASCADE로 tb_role_menu_permission 매핑도 함께 삭제됨
--       (tb_menu_permission은 이번 작업에서 행을 추가하지 않았으므로 해당 없음).
--
-- 참고: 이 스크립트는 구 메뉴(ST_WAREHOUSE) 삭제를 되돌리지 않습니다. 해당 메뉴가 참조하던
--       화면/백엔드 코드가 이미 삭제되어 복구해도 동작하지 않으므로, 되돌릴 실익이 없는
--       일회성 정리로 간주합니다. 필요 시 20260909_002_seed_warehouse_menu.sql을 참고해 수동으로
--       재등록할 수 있으나 코드가 없는 상태라 권장하지 않습니다.

DELETE FROM tb_menu
WHERE menu_code = 'CO_WAREHOUSE'
  AND tenant_id = (SELECT tenant_id FROM tb_tenant WHERE tenant_code = 'T1358606250');
