# 20261105_001 창고등록 화면 구현 결과

참고: [[20261105_001_warehouse_screen_direction]] · [[20261105_001_warehouse_screen_plan]] · [[20261105_001_warehouse_screen_spec]]

## 구현 범위

`co/master/warehouse` 화면(조회/등록/수정, `tb_warehouse` 단일 테이블)을 `co/master/customers` 패턴으로 신규 구현. 메뉴/권한 등록은 범위 제외(다음 작업).

## 변경 파일

### 백엔드

- 신규: `backend/src/main/java/egovframework/let/co/master/warehouse/**` (controller, service/impl, domain.model 7종, domain.repository)
- 신규: `backend/src/main/resources/egovframework/mapper/let/co/master/warehouse/Warehouse_SQL_postgresql.xml`
- 수정: `backend/src/main/java/egovframework/com/config/EgovConfigAppIdGen.java` — `warehouseCodeIdGnrService` 빈 추가 (`IDS`/`tb_warehouse`, 3자리, prefix 없음)
- 삭제: `backend/src/main/java/egovframework/let/system/warehouses/**` (7개 파일), `backend/src/main/resources/egovframework/mapper/let/system/warehouses/EgovSystemWarehouse_SQL_postgresql.xml`

### 프론트엔드

- 신규: `frontend/src/pages/co/master/warehouse/**` (Page, components/WarehouseGrid, hooks/useWarehouseManagement, services/warehouseManagement.service, types/warehouseManagement.types, utils/warehouseNumberInput)
- 수정: `frontend/src/pages/dashboard/components/DashboardContent.tsx` — `selectedModule.id==='co' && currentPageKey==='warehouse'` 라우팅 분기 추가
- 수정: `frontend/tests/page-initial-errors.test.tsx` — 경로/모듈을 새 화면으로 재조정, `['co','warehouse']` 케이스 추가
- 삭제: `frontend/src/pages/settings/system/warehouses/**` (4개 파일), `frontend/tests/warehouse-management-page.test.tsx`

### DB

- 변경 없음 (`tb_warehouse`는 2026-11-05에 이미 재생성 완료, [[20261105_001_create_warehouse_schema.sql]] 참고). 이번 작업에서 스키마 변경 없음.

## 사양 반영 확인

- 창고코드: 빈값 → `warehouseCodeIdGnrService.getNextStringId()`로 `001`부터 3자리 채번, 직접 입력 시 `tenant_id+warehouse_code` 중복 검증. 수정 시 빈값이면 기존 코드 유지.
- 창고구분: 공통코드 `WAREHOUSE_TYPE`(이미 DB에 4개 항목 존재) 콤보, `item_code`를 값으로 저장.
- 체크박스 6종(`delete_lock_at` 등): F1-Grid `type:'checkbox'` + `onValueChange`로 `'Y'/'N'` 문자열 강제 변환.
- 사업장: `plant_id` 고정 콤보(`0:사내`, `1:외부`), 추후 테이블 연동 전제.
- 담당자: F1-Grid `type:'user'` 컬럼, `/api/v1/co/master/warehouses/users`(신규, `department_id` 포함)로 옵션 조회, 선택 시 `departmentId`/`departmentName` 자동 patch. 담당부서 컬럼은 `editable:false`로 표시만.

## 검증

- 백엔드: `cd backend && mvn -o -DskipTests clean compile` → **BUILD SUCCESS** (434개 소스, Java 8 바이트코드 타겟 확인, `var`/`record`/`List.of` 미사용).
- 프론트엔드: `npm run build` → **성공** (코디에이터가 재확인). `npm run test -- tests/page-initial-errors.test.tsx` → **14/14 통과**.
- 전체 `npm run test`는 기존에도 실패하던 `dashboard-sidebar.test.tsx`(로그인 플로우 타이밍) 및 `common-code-management-page.test.tsx`(본 작업과 무관한 `CommonCodeManagementPanel.tsx` 기존 결함) 실패가 그대로 존재함 — `git stash`로 변경 전 상태에서도 동일하게 실패함을 확인하여 **본 작업으로 인한 신규 실패 없음**을 확인함.
- DB MCP 확인: 본 작업은 스키마 변경이 없으므로 신규 MCP 조회는 수행하지 않음. 선행 작업(2026-11-05 테이블 재생성 시점)에서 `s-erp-postgresql-readonly` MCP로 `tb_warehouse`/FK 대상 테이블 구조를 모두 확인한 근거는 [[20261105_001_change_warehouse_schema.md]]에 기록되어 있음.
- 실제 화면 스크린샷은 생략함 — 메뉴 미등록 상태라 사이드바로 진입할 경로가 없고, 라우팅 분기는 코드 리뷰와 빌드 통과로 확인함. 메뉴/권한 등록 작업 시 실제 화면 확인을 진행할 예정.

## 다음 작업

- `tb_menu`/`tb_role_menu_permission`에 `co/master/warehouse` 메뉴 및 권한 등록 (별도 작업지시서 필요).
- 메뉴 등록 후 실제 브라우저에서 화면 동작(코드 자동채번, 사원선택 연동, 체크박스 저장) 스크린샷 확인.
