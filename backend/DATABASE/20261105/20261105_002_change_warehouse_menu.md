# 20261105_002 창고관리 메뉴/권한 등록 이력

## 변경 일자

2026-11-05

## 변경 내용

- `T1358606250`(에프원소프트) 테넌트에 `창고관리`(`/co/master/warehouse`) 메뉴 등록 (`20261105_002_seed_warehouse_menu.sql`)
- 위치: 기준정보 관리(`CO_COMMON`) 하위, `sort_order` 50 (`CO_UPRICE` 다음)
- 역할 부여(`tb_role_menu_permission`): 테넌트 내 사용 중인(`use_at='Y'`) **모든 역할**(`PLATFORM_ADMIN`, `ADMIN`, `ROLE_INFO_MANAGER`, `DEFAULT_USER`) → `READ`/`CREATE`/`UPDATE`/`EXCEL` 동일 부여. `DELETE`는 부여하지 않음(화면에서 삭제를 지원하지 않고 불용창고 체크로 대체, `CO_CUSTOMER`/`CO_MATERIAL`과 동일 기준).
- `tb_menu_permission`(메뉴별 지원 권한 카탈로그)은 행을 추가하지 않음 — `CO_CUSTOMER`/`CO_MATERIAL`/`CO_COM_CODE`/`CO_UPRICE` 등 기존 `CO_*` 메뉴들도 이 테이블에 행이 없는 상태였고, 역할 권한 체크는 `tb_role_menu_permission` 직접 조회로 동작하는 것을 MCP로 확인함. 기존 관례를 그대로 따름.
- (사용자 요청에 따라 함께 정리) 코드가 삭제된 구 테스트 화면이 쓰던 `ST_WAREHOUSE` 메뉴(`use_at='N'`, 비활성) 삭제. FK `ON DELETE CASCADE`로 연결된 `tb_menu_permission`/`tb_role_menu_permission` 매핑도 함께 삭제됨.

## 적용 대상 테이블

- `tb_menu` (row 1건 추가: `CO_WAREHOUSE`, row 1건 삭제: `ST_WAREHOUSE`)
- `tb_role_menu_permission` (row 4건 × 4역할 = 16건 추가, `ST_WAREHOUSE` 연결 5건은 CASCADE로 삭제)

## 영향 범위

- FE: `/co/master/warehouse` → `DashboardContent.tsx`의 `selectedModule.id === 'co' && currentPageKey === 'warehouse'` 게이트로 라우팅(이미 구현됨, [[20261105_001_warehouse_screen_result]] 참고). 모든 역할 사용자 사이드바 "기준정보 관리" 아래에 노출됨.
- 스키마 변경 없음(seed only). 기존 메뉴/권한 row 무변경.
- 모든 INSERT는 `tenant_code`로 스코프 + `ON CONFLICT DO NOTHING` → 재실행 안전.

## 참고 사항

- 구 테스트 화면이 쓰던 `ST_WAREHOUSE` 메뉴(비활성, `use_at='N'`)는 코드가 이미 삭제된 상태였고, 사용자 확인 후 이번 스크립트에서 함께 삭제하기로 함(0번 단계).

## 롤백 여부

- 가능. `20261105_002_rollback.sql` — `tb_menu`의 `CO_WAREHOUSE` 한 줄 삭제 시 FK `ON DELETE CASCADE`로 `tb_role_menu_permission` 매핑 동반 삭제.

## DB MCP 확인 근거

- `s-erp-postgresql-readonly` MCP로 사전 확인 완료 (2026-11-05):
  - `tb_module` → `module_code='COMMON'`이 프론트 `co` 모듈에 대응함을 확인
  - `tb_menu`(module COMMON) → 부모 메뉴 `CO_COMMON`(menu_id 13), 형제 메뉴 `CO_COM_CODE/CO_MATERIAL/CO_CUSTOMER/CO_UPRICE`의 `sort_order`(10/20/30/40) 확인 → 50으로 결정
  - `tb_role` → 테넌트 내 역할 4종(`PLATFORM_ADMIN`,`ADMIN`,`ROLE_INFO_MANAGER`,`DEFAULT_USER`) 전부 `use_at='Y'` 확인
  - `tb_role_menu_permission`/`tb_menu_permission` 조인 조회 → `CO_*` 메뉴들은 `tb_menu_permission` 카탈로그 없이 `tb_role_menu_permission`만으로 동작 중임을 확인
  - `tb_menu` → `ST_WAREHOUSE` 잔존 행 확인(`use_at='N'`)

## 관련 문서

- [[20261105_001_warehouse_screen_direction]] · [[20261105_001_warehouse_screen_plan]] · [[20261105_001_warehouse_screen_spec]] · [[20261105_001_warehouse_screen_result]]
