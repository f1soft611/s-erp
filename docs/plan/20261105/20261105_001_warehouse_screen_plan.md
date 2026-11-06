# 20261105_001 창고등록 화면 구현 계획서

참고: [[20261105_001_warehouse_screen_direction]]

## 목표

`tb_warehouse` 단일 테이블을 다루는 `co/master/warehouse` 화면을 `co/master/customers` 패턴(F1-Grid 기반 조회/등록/수정 그리드 + 저장 배치 API)으로 구현한다.

## 기준 패턴 (그대로 재사용)

- 프론트: `frontend/src/pages/co/master/customers/*` 구조(Page/components/hooks/services/types)
- 백엔드: `egovframework.let.co.master.customer.*` 패키지 구조(controller/service/service.impl/domain.model/domain.repository) + `CustomerInfo_SQL_postgresql.xml` 매퍼
- 코드 자동 채번: `EgovConfigAppIdGen`의 `customerCodeIdGnrService`/`materialCodeIdGnrService` 패턴 → `warehouseCodeIdGnrService` 신규 추가 (`table=IDS`, `tableName=tb_warehouse`, `cipers=3`, `prefix=""`)
- 사원 선택: F1-Grid `type:'user'` 컬럼 + `userOptions`(`value/label/avatarUrl/positionName/departmentName`), 데이터 소스는 `egovframework.let.co.workflow.form`의 `listUserOptions` SQL(`DraftingWork_SQL_postgresql.xml`)을 참고해 `department_id`를 추가 선택하는 창고 전용 쿼리로 작성
- 공통코드 콤보: `co/master/common-code` 서비스(`fetchCommonCodeGroups`/`fetchCommonCodeItems`)로 `WAREHOUSE_TYPE` 그룹(이미 DB에 존재, item_code 기준) 조회

## 작업 단계

1. **기존 테스트 화면 제거**
   - `frontend/src/pages/settings/system/warehouses/**`, 관련 테스트(`frontend/tests/warehouse-management-page.test.tsx`)
   - `backend/.../let/system/warehouses/**`, 매퍼 `EgovSystemWarehouse_SQL_postgresql.xml`
   - 메뉴 미등록 상태이므로 라우팅/DashboardContent에 참조 없음 (확인됨, 제거 작업 불필요)

2. **백엔드 구현** (`egovframework.let.co.master.warehouse`)
   - domain.model: `WarehouseVO`, `WarehouseSearchCondition`, `WarehouseSaveRequestVO`, `WarehouseChangeVO`, `WarehouseBatchSaveRequestVO`, `WarehouseBatchChangeSetVO`, `WarehouseBatchSaveResultVO`, `WarehouseUserOptionVO`
   - domain.repository: `WarehouseDAO`
   - service / service.impl: `WarehouseService`/`WarehouseServiceImpl` (단건 CRUD, 코드 자동/수동 채번 분기, 중복코드 검증), `WarehouseBatchService`/`WarehouseBatchServiceImpl` (배치 저장, delete 미지원)
   - controller: `WarehouseApiController` (`/api/v1/co/master/warehouses`) — 목록/단건등록/단건수정/배치저장/사원옵션조회(`/users`)
   - 매퍼: `backend/src/main/resources/egovframework/mapper/let/co/master/warehouse/Warehouse_SQL_postgresql.xml`
   - `EgovConfigAppIdGen`에 `warehouseCodeIdGnrService` 빈 추가

3. **프론트엔드 구현** (`frontend/src/pages/co/master/warehouse`)
   - `types/warehouseManagement.types.ts`, `services/warehouseManagement.service.ts`, `hooks/useWarehouseManagement.ts`, `components/WarehouseGrid.tsx`, `WarehouseManagementPage.tsx`
   - 공통코드/사원옵션은 페이지 레벨에서 조회 후 그리드 컬럼 생성 함수에 주입
   - `DashboardContent.tsx`에 `selectedModule.id === 'co' && currentPageKey === 'warehouse'` 분기 추가 (메뉴 등록 전이라도 화면 자체 동작 확인 가능하도록)

4. **검증**
   - 프론트: `npm run build`, 관련 vitest 실행
   - 백엔드: Java 8 호환 문법 준수 확인(= 기존 패턴 그대로 사용하면 자연히 충족), 가능 범위에서 컴파일 확인
   - 결과 문서 작성 (`docs/result/20261105/co-master-warehouse-screen`)

## 범위 제외

- 메뉴(`tb_menu`) 및 권한(`tb_role_menu_permission`) 등록은 다음 작업에서 별도 진행.
- `plant_id` 실제 테이블 연동, `warehouse_type` 외 추가 공통코드 신규 생성 없음(이미 존재하는 `WAREHOUSE_TYPE` 재사용).
