# 20261105_001 창고등록 화면 상세 사양서

참고: [[20261105_001_warehouse_screen_plan]]

## 1. DB 契約 (이미 생성됨, 변경 없음)

`tb_warehouse` 컬럼/제약은 [[20261105_001_create_warehouse_schema.sql]] 참고. 본 작업은 스키마 변경 없음.

## 2. 백엔드 API (`/api/v1/co/master/warehouses`)

패턴은 `CustomerInfoApiController`/`CustomerInfoService`/`CustomerInfoBatchService`와 동일하게 구성한다.

### 2.1 목록 조회 `GET /api/v1/co/master/warehouses`

쿼리 파라미터(전부 선택): `keyword`(코드/명 검색), `warehouseType`, `useAt`는 없음(삭제 개념 없음, `disuse_at`으로 대체) — 검색조건은 최소로: `keyword`, `warehouseType`, `disuseAt`.

응답: `{ resultList: WarehouseVO[] }` (camelCase JSON, Jackson 기본 변환)

`WarehouseVO` 필드: `warehouseId, tenantId, warehouseCode, warehouseName, warehouseType, deleteLockAt, disuseAt, stockQtyDispAt, stockIoAt, safetyStockAlertAt, stockDefaultAt, plantId, customerId, managerUserId, managerUserName, departmentId, departmentName, telNo, faxNo, address, remark, createdBy, createdAt, updatedBy, updatedAt`

- `managerUserName`, `departmentName`은 목록 조회시 `tb_user`/`tb_department` LEFT JOIN으로 함께 조회해 화면에 바로 표시한다 (거래처의 `businessKind1Name`과 동일한 방식).

### 2.2 사원 선택 옵션 `GET /api/v1/co/master/warehouses/users`

`DraftingWork_SQL_postgresql.xml`의 `selectUserOptions`를 참고하되 **`department_id`를 추가로 SELECT**한다.

```sql
SELECT u.user_id, u.department_id, d.department_nm, u.user_nm, la.profile_image,
       CASE WHEN lg.group_code = 'LEVEL' THEN li.item_nm END AS level_nm
FROM tb_user u
JOIN tb_login_account la ON la.login_id = u.login_id AND la.tenant_id = u.tenant_id AND la.use_at = 'Y'
LEFT JOIN tb_department d ON d.department_id = u.department_id AND d.tenant_id = u.tenant_id
LEFT JOIN tb_common_code_item li ON li.common_code_item_id = u.level_id AND li.tenant_id = u.tenant_id AND li.use_at = 'Y'
LEFT JOIN tb_common_code_group lg ON lg.common_code_group_id = li.group_id AND lg.tenant_id = u.tenant_id AND lg.group_code = 'LEVEL' AND lg.use_at = 'Y'
WHERE u.tenant_id = #{value} AND u.use_at = 'Y'
ORDER BY u.user_nm ASC, u.user_id ASC
```

응답: `{ resultList: WarehouseUserOptionVO[] }`, 필드: `userId, departmentId, departmentNm, userNm, profileImage, levelNm`

> 주의: 창고의 `manager_user_id` FK는 `tb_user(user_id)`를 직접 참조한다(기안양식의 `login_id` 참조와 다름). 그리드 `type:'user'` 컬럼의 `value`는 반드시 `userId`를 사용한다.

### 2.3 등록 `POST /api/v1/co/master/warehouses`

요청 바디(`WarehouseSaveRequestVO`): `warehouseCode(선택, 빈값 허용), warehouseName(필수), warehouseType, deleteLockAt, disuseAt, stockQtyDispAt, stockIoAt, safetyStockAlertAt, stockDefaultAt, plantId, customerId, managerUserId, departmentId, telNo, faxNo, address, remark`

응답: `{ item: WarehouseVO }` (201)

### 2.4 수정 `PUT /api/v1/co/master/warehouses/{warehouseId}`

요청/응답 형태는 등록과 동일하나 `warehouseCode`는 빈값이면 기존 값 유지(변경 안 함), 값이 있으면 그 값으로 변경 시도(중복 검증).

### 2.5 배치 저장 `POST /api/v1/co/master/warehouses/save-batch`

`CustomerInfoBatchService` 패턴과 동일. 요청 `{ warehouses: { insertedRows: WarehouseChangeVO[], updatedRows: WarehouseChangeVO[], deletedRows: [] } }`. `deletedRows`가 비어있지 않으면 `"창고는 삭제할 수 없습니다. 불용창고로 변경해 주세요."` 오류.

응답 `{ item: { warehouses: WarehouseVO[], rowIdMappings: Record<string,string> } }`

## 3. 창고코드 처리 규칙 (핵심)

거래처/품목과 달리 **사용자가 코드를 직접 입력할 수 있다.**

- `WarehouseServiceImpl.resolveWarehouseCode(tenantId, requestedCode)`:
  - `requestedCode`가 공백/빈값이면 → `warehouseCodeIdGnrService.getNextStringId()`로 채번한 3자리 코드(`001`, `002`, ...) 사용.
  - 값이 있으면 → trim한 값을 그대로 사용하고, `tenant_id + warehouse_code` 중복 여부를 `selectWarehouseIdByCode`로 사전 검증(중복 시 `"이미 사용 중인 창고코드입니다."`).
  - 수정 시 코드값을 비워서 보내면 기존 코드를 유지한다(재채번하지 않음).
- `EgovConfigAppIdGen`에 추가할 빈:

```java
@Bean(destroyMethod = "destroy")
public EgovTableIdGnrServiceImpl warehouseCodeIdGnrService() {
    return new EgovIdGnrBuilder().setDataSource(egovDataSource)
            .setEgovIdGnrStrategyImpl(new EgovIdGnrStrategyImpl())
            .setBlockSize(1)
            .setTable("IDS")
            .setTableName("tb_warehouse")
            .setPreFix("")
            .setCipers(3)
            .setFillChar('0')
            .build();
}
```

- 중복 저장 예외 매핑(`DuplicateKeyException` → 사용자 메시지)은 제약명 기준: `uq_tb_warehouse_tenant_code` → `"이미 사용 중인 창고코드입니다."`

## 4. 프론트엔드 그리드 컬럼 정의

`createWarehouseColumns(canEdit, userOptions, warehouseTypeItems)` (파일: `components/WarehouseGrid.tsx`), 순서는 작업지시서 표와 동일:

| field | type | 비고 |
|---|---|---|
| `warehouseId` | `rownumber` | pinned left |
| `warehouseCode` | text | **editable: canEdit** (거래처와 달리 직접입력 허용), 빈칸 허용 |
| `warehouseName` | text | required |
| `warehouseType` | `select` | options = `warehouseTypeItems.map(i => ({ value: i.itemCode, label: i.itemNm }))` |
| `deleteLockAt` | `checkbox` | `onValueChange: (row, checked) => ({ deleteLockAt: checked ? 'Y' : 'N' })` |
| `disuseAt` | `checkbox` | 동일 패턴 |
| `stockQtyDispAt` | `checkbox` | 동일 패턴 |
| `stockIoAt` | `checkbox` | 동일 패턴 |
| `safetyStockAlertAt` | `checkbox` | 동일 패턴 |
| `stockDefaultAt` | `checkbox` | 동일 패턴 |
| `plantId` | `select` | options = `[{value:0,label:'사내'},{value:1,label:'외부'}]` (고정값, 추후 테이블 연동 예정 주석 남기기) |
| `managerUserId` | `user` | `userOptions = userOptions.map(u => ({ value: u.userId, label: u.userNm, avatarUrl: u.profileImage, positionName: u.levelNm, departmentName: u.departmentNm }))`. `onValueChange: (row, value) => { const u = userOptions.find(x => String(x.userId) === String(value)); return { managerUserId: value, departmentId: u?.departmentId ?? null, departmentName: u?.departmentNm ?? '' }; }` |
| `departmentId` | text(표시전용) | `editable: false` 고정, `renderCell: () => row.departmentName` |
| `telNo` | text | `inputFormat: korean-phone` (거래처 패턴 재사용) |
| `faxNo` | text | 동일 |
| `address` | text | |
| `remark` | text | |
| `tenantId/createdBy/createdAt/updatedBy/updatedAt` | hidden | 거래처 패턴과 동일하게 숨김 처리 |

`createWarehouseRow()` 기본값: `deleteLockAt:'N', disuseAt:'N', stockQtyDispAt:'Y', stockIoAt:'Y', safetyStockAlertAt:'N', stockDefaultAt:'N'` (DB default와 동일), `warehouseCode:''`.

## 5. 페이지 구성

`WarehouseManagementPage.tsx`는 `CustomerManagementPage.tsx`를 기준으로 하되 거래처 분류 다이얼로그 관련 로직은 없음(단순화). 페이지 마운트 시:

1. `fetchWarehouses()` (초기 목록)
2. `fetchCommonCodeGroups()` → `WAREHOUSE_TYPE` 그룹 찾기 → `fetchCommonCodeItems(group.id)` (useAt='Y' 필터)
3. `fetchWarehouseUserOptions()` (사원 목록)

2/3은 그리드 컬럼 생성에 필요하므로 페이지 레벨 훅(`useWarehouseManagement`)에서 함께 로드하고, 로딩 완료 전에는 그리드를 비활성화하거나 빈 옵션으로 렌더링 후 옵션 로드 완료 시 컬럼을 재생성(`useMemo` deps에 옵션 포함)한다.

## 6. 라우팅 연결 (메뉴 등록 전 임시)

`frontend/src/pages/dashboard/components/DashboardContent.tsx`에 추가:

```tsx
if (selectedModule.id === 'co' && currentPageKey === 'warehouse') {
  return (
    <WarehouseManagementPage
      selectedModule={selectedModule}
      currentMenuName={currentMenuName}
      content={content}
      breadcrumbItems={breadcrumbItems}
      selectedMenuPermissions={selectedMenuPermissions}
      isTenantAdmin={isTenantAdmin}
    />
  );
}
```

(`CustomerManagementPage` 분기 바로 아래에 추가, import문도 함께 추가)

## 7. 제거 대상 파일

- `frontend/src/pages/settings/system/warehouses/` 전체
- `frontend/tests/warehouse-management-page.test.tsx`
- `backend/src/main/java/egovframework/let/system/warehouses/` 전체
- `backend/src/main/resources/egovframework/mapper/let/system/warehouses/EgovSystemWarehouse_SQL_postgresql.xml`

## 8. 검증 기준

- 신규 창고 추가 시 코드 빈칸 → `001`부터 순번 생성, 코드 직접입력 시 해당 값 저장, 중복 시 에러 메시지.
- 담당자 선택 시 담당부서 자동 반영 및 직접 수정 불가.
- 체크박스 6종 저장 값이 DB에 `Y`/`N`으로 정확히 반영.
- `npm run build`, 관련 vitest 통과.
