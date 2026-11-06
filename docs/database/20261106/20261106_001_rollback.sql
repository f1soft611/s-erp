-- 20261106_001_rollback.sql
-- '창고관리'(CO_WAREHOUSE) 메뉴 설명을 변경 전 문구로 되돌립니다.

UPDATE tb_menu
SET menu_dc = '테넌트별 창고 마스터(창고코드/창고명/창고구분 등)를 관리합니다.'
WHERE menu_code = 'CO_WAREHOUSE'
  AND tenant_id = (SELECT tenant_id FROM tb_tenant WHERE tenant_code = 'T1358606250');
