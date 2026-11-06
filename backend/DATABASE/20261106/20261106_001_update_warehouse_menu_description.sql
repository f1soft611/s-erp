-- 20261106_001_update_warehouse_menu_description.sql
-- 대상 DB: s-erp_central (PostgreSQL)
-- 목적: '창고관리'(CO_WAREHOUSE) 메뉴 설명 문구를 화면에 맞게 수정

UPDATE tb_menu
SET menu_dc = '창고 정보(창고명/창고구분 등)를 관리합니다.'
WHERE menu_code = 'CO_WAREHOUSE'
  AND tenant_id = (SELECT tenant_id FROM tb_tenant WHERE tenant_code = 'T1358606250');
