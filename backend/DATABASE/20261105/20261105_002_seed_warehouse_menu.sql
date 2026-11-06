-- 20261105_002_seed_warehouse_menu.sql
-- 대상 DB: s-erp_central (PostgreSQL)
-- 목적: 신규 '창고관리'(co/master/warehouse) 화면을 T1358606250(에프원소프트) 테넌트 사이드바에 등록하고
--       모든 역할(사용자)에게 동일 권한(READ/CREATE/UPDATE/EXCEL)을 부여한다.
--       아울러 2026-11-05에 코드가 삭제된 구(舊) 테스트 화면의 잔존 메뉴(ST_WAREHOUSE, use_at='N')를 함께 정리한다.
-- 참고: 20260909_002_seed_warehouse_menu.sql 관례(INSERT ... SELECT ... ON CONFLICT DO NOTHING, id 하드코딩 없음),
--       단 메뉴 위치는 기준정보 관리(CO_COMMON) 하위이며, tb_menu_permission(메뉴별 지원 권한 카탈로그)은
--       CO_CUSTOMER/CO_MATERIAL/CO_COM_CODE/CO_UPRICE 등 최근 CO_* 메뉴들과 동일하게 생략하고
--       tb_role_menu_permission(역할별 실제 부여)만 채운다.

-- 0) 정리: 코드가 삭제된 구 테스트 화면의 잔존 메뉴(ST_WAREHOUSE) 삭제
--    FK ON DELETE CASCADE로 tb_menu_permission / tb_role_menu_permission 매핑도 함께 삭제됨.
DELETE FROM tb_menu
WHERE menu_code = 'ST_WAREHOUSE'
  AND tenant_id = (SELECT tenant_id FROM tb_tenant WHERE tenant_code = 'T1358606250');

-- 1) 메뉴 노드: 기준정보 관리(CO_COMMON) > 창고관리
INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, p.module_id, p.menu_id,
       'CO_WAREHOUSE', '창고관리', '/co/master/warehouse', NULL, 50, 'Y',
       '테넌트별 창고 마스터(창고코드/창고명/창고구분 등)를 관리합니다.'
FROM tb_tenant t
JOIN tb_menu p ON p.tenant_id = t.tenant_id AND p.menu_code = 'CO_COMMON'
WHERE t.tenant_code = 'T1358606250'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

-- 2) 역할별 부여 권한 (tb_role_menu_permission): 모든 역할(사용자) → READ/CREATE/UPDATE/EXCEL 동일 부여
--    (삭제 기능이 없는 화면이므로 DELETE는 부여하지 않음 — CO_CUSTOMER/CO_MATERIAL과 동일 기준)
INSERT INTO tb_role_menu_permission (role_id, menu_id, permission_id)
SELECT r.role_id, mn.menu_id, pm.permission_id
FROM tb_menu mn
JOIN tb_tenant t ON t.tenant_id = mn.tenant_id
JOIN tb_role r ON r.tenant_id = mn.tenant_id AND r.use_at = 'Y'
JOIN tb_permission pm ON pm.permission_code IN ('READ', 'CREATE', 'UPDATE', 'EXCEL')
WHERE t.tenant_code = 'T1358606250' AND mn.menu_code = 'CO_WAREHOUSE'
ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;
