# 20261119_008 인사관리 1단계 부서관리 상세사양서

기준: [계획서](../../plan/20261119/20261119_008_hr-department_계획서.md)

## 1. DB (DB MCP로 확인한 현재 계약)
`tb_department`: `department_id`(IDENTITY), `tenant_id`, `department_nm`, `parent_department_id`(자기참조, ON DELETE SET NULL), `sort_order`(기본 0), `use_at`('Y'), `created_at`, `updated_at`. 인덱스 `idx_parent_department`, `idx_tenant_department`. 참조 FK: `tb_user.department_id`, `tb_warehouse.department_id`, `tb_purchase_request_hd.request_dept_id`, `tb_purchase_order_hd.order_dept_id`, `tb_purchase_arrival_hd.receiver_dept_id`, `tb_purchase_receipt_hd.receiver_dept_id`, `tb_quality_inspection_hd.inspector_dept_id`. 조회 시점 부서 0건.

변경:
- `manager_user_id BIGINT NULL` → `tb_user(user_id)` FK(ON DELETE SET NULL)
- `department_dc VARCHAR(500) NULL`
- `created_by BIGINT NULL`, `updated_by BIGINT NULL` (창고 감사컬럼과 동일)
- 유일 제약: 최상위는 `(tenant_id, department_nm)`, 하위는 `(tenant_id, parent_department_id, department_nm)` 부분 유일 인덱스 2개(`parent_department_id IS NULL` / `IS NOT NULL`). 사용안함 부서도 이름을 점유한다.
- 모듈 `HR`/인사관리/`/hr`/sort 6, 메뉴 `HR_INFO`(그룹 "인사정보", `/hr/info`), `HR_INFO_DEPARTMENT`(`/hr/info/department-manage`), 권한 READ·CREATE·UPDATE(삭제 기능이 없으므로 DELETE 제외), 역할 권한은 창고관리(`CO_WAREHOUSE`) 메뉴에서 복사. 그룹 메뉴 "인사정보" 하나에 부서관리·사원정보·인사명령 세 화면을 담는다(사용자 결정). 이번 단계는 그룹과 "부서관리" 화면만 만들고, 이후 단계가 `HR_INFO_EMPLOYEE`, `HR_INFO_ORDER`를 같은 그룹에 추가한다. 스크립트는 `20261117_005_seed_quality_inspect_menu.sql` 패턴(재실행 안전, 충돌 시 예외)을 따른다.
- 테이블 접두어 규칙상 신규 테이블은 없다.

## 2. 백엔드 `egovframework.let.hr.department`
- 경로: `controller/DepartmentApiController`, `service/DepartmentService`, `service/impl/DepartmentServiceImpl`, `domain/model/*VO`, `domain/repository/DepartmentDAO`; Mapper `mapper/let/hr/department/Department_SQL_postgresql.xml`; 테스트 `src/test/.../hr/department`.
- API 기본 경로 `/api/v1/hr/departments` (기존 `/api/v1/<모듈>/<자원>` 패턴 준수):
  - `GET /api/v1/hr/departments?includeInactive=false` → 부서 전체 목록(트리 구성은 프론트, `departmentId, parentDepartmentId, departmentNm, managerUserId, managerUserNm, departmentDc, sortOrder, useAt, childCount, userCount`)
  - `POST /api/v1/hr/departments` 등록, `PUT /api/v1/hr/departments/{id}` 수정(상위·이름·부서장·정렬·설명)
  - `PUT /api/v1/hr/departments/{id}/use` 본문 `useAt`('Y'/'N') 사용안함·복원
  - `GET /api/v1/hr/departments/{id}/users` 소속 사원 목록(`userId, userNm, levelNm, loginCode, mobileNo, emailAddr, managerYn`)
  - `GET /api/v1/hr/departments/unassigned/users` 부서가 지정되지 않은 사용 중인 사원(회사 노드 선택 시)
  - 목록 응답(`GET /api/v1/hr/departments`)에는 `companyName`(`tb_tenant.tenant_nm`, 회사정보 화면과 같은 값)이 함께 온다.
- 테넌트는 인증 정보에서 얻고 요청 본문에서 받지 않는다. 권한은 기존 화면 단위 권한 방식(READ 조회, UPDATE 저장)을 따른다.
- 검증(서버):
  - 부서명 필수·공백 제거·최대 길이(컬럼 길이), 정렬순서 정수.
  - 같은 상위 아래 동일 부서명 → 409 `duplicateName`.
  - 상위 부서는 같은 테넌트의 사용 중 부서만, 자기 자신·자기 하위 지정(순환) → 400 `circularParent`.
  - 사용안함(`N`): 사용 중 하위 부서나 `tb_user.use_at='Y'` 소속 사원이 있으면 409 `inUse`("하위 부서 또는 소속 사원이 있어 사용안함 처리할 수 없습니다."). 복원(`Y`)은 상위가 사용안함이면 409 `parentInactive`.
  - 부서장은 그 부서의 사용 중인 소속 사원(`tb_user.department_id` = 해당 부서)만 지정할 수 있다(사용자 결정, 2026-11-19). 선택지는 `GET /{id}/users`를 재사용하고 전체 사원을 주는 별도 API는 두지 않는다. 신규 등록에서는 소속 사원이 없으므로 부서장을 지정할 수 없다(400, 등록 후 편집에서 지정). 수정에서는 부서장을 **바꿀 때만** 소속 여부를 검사하며, 부서장이 다른 부서로 옮겨 간 뒤 이름만 고치는 수정은 막지 않는다.
  - 삭제 API 없음.
- Java 8 호환 코드만 사용한다.

## 3. 프론트 `pages/hr/department`
- 구조: `DepartmentManagePage.tsx`, `components/`(`DepartmentTree`, `DepartmentFormDialog`, `DepartmentUserGrid`), `hooks/`(`useDepartmentManage`), `services/department.service.ts`, `types/department.types.ts`.
- 레이아웃 기준 화면: 단가 "거래처 기준"(좌 트리 + 우 상세) 및 창고관리의 페이지 헤더·메시지 영역. 375px 이하는 트리·목록 세로 배치.
- 트리: `F1Tree`(`rowKey=departmentId`, `parentKey=parentDepartmentId`, `treeColumn=departmentNm`, `defaultExpandAll`) + `treeNodeIcon`(하위 있음·열림 `FolderOpen`, 하위 있음·닫힘 `Folder`, 하위 없음 `Description` 계열 아이콘). 컬럼: 부서명(트리), 부서장, 사용. 사용안함 행은 흐리게 표시, 상단 "사용안함 포함" 토글(기본 꺼짐).
- 최상단 회사 노드(사용자 결정, 2026-11-19): 트리 맨 위에 회사명 노드를 화면에서만 만든다(건물 아이콘, DB 행 아님, 행 ID `-1`). 이름은 목록 응답의 `companyName`을 따르므로 회사정보에서 회사명을 바꾸면 자동 반영되고 소스 수정이 필요 없다. 최상위 부서(`parent_department_id = NULL`)를 회사 노드 아래에 연결해 보여 주며 DB와 서버 규칙은 바뀌지 않는다. 회사 노드는 편집·사용안함·복원이 비활성이고 "하위 부서 추가"만 가능하다(= 최상위 부서 추가). 선택하면 우측에 부서 미지정 사원을 보여 준다. 팝업의 상위 부서 맨 위에 "회사명(최상위)"을 두고 선택하면 상위 없음(null)으로 저장한다.
- 우클릭 메뉴(`treeContextMenu`): 하위 부서 추가(루트에서는 "최상위 부서 추가"), 편집, 사용안함/복원. 삭제 메뉴는 없다. 추가·편집은 `CommonDialog` 안의 폼(상위 부서 선택, 부서명*, 부서장 선택(그 부서 소속 사원만, 등록 팝업에서는 비활성), 정렬순서, 설명). 상위 부서는 "하위 부서 추가"로 열면 우클릭한 부서가 미리 선택되고, 후보는 사용 중인 부서에서 자기 자신과 하위 부서를 뺀 목록이다(순환 이동은 서버에서도 차단). 현재 상위 부서가 사용안함이면 그 값을 목록에 남겨 이름만 고쳐도 상위 부서가 지워지지 않게 한다. 저장 후 목록 재조회, 서버 409/400 메시지는 폼 상단 `Alert`.
- 우측: 선택한 부서의 소속 사원 `F1Grid`(조회 전용). 부서장은 "부서장" 표시, 선택 없으면 안내 문구.
- 로딩·오류·빈 상태(부서 0건 시 "최상위 부서 추가" 안내)를 모두 표시한다.
- 라우트·메뉴: 메뉴 URL `/hr/info/department-manage`를 `DashboardContent`의 페이지 분기(`selectedModule.id === 'hr'`, 페이지 키 `department-manage`)에 등록하고, 모듈별 경로를 나열하는 `AppRouter.tsx`에 `/hr/*` 라우트를 추가한다(신규 모듈은 이 라우트가 없으면 "페이지를 찾을 수 없습니다"가 나온다).

## 4. F1Tree `treeNodeIcon`
- `F1TreeProps`에 `treeNodeIcon?: (node: { row: T; rowId; depth: number; expanded: boolean; hasChildren: boolean }) => ReactNode` 추가. `cellAdornment`에서 펼침 화살표(또는 빈 슬롯) 뒤, 트리 체크박스 유무와 무관하게 그 뒤에 아이콘을 그린다. 미지정 시 DOM이 변경 전과 같다.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`에 옵션 설명·예시를 추가한다.
- 추가 확장(승인된 "우클릭 편집/사용안함" 메뉴를 위해): `F1GridContextMenuTreeConfig.items?: { key; label; disabled?(rowId); onClick(rowId) }[]`. 우클릭 메뉴의 추가 항목 뒤에 그리고, 누르면 메뉴를 닫은 뒤 우클릭한 행 id로 호출한다. 미지정 시 메뉴는 변경 전과 같다. 문서 3곳(F1-GRID.md, `f1GridApiReference.ts`, `f1GridDocs.ts`)과 테스트(`f1-tree-context-menu-items.test.tsx`)를 함께 갱신한다.

## 5. 검증
- 단위: `F1Tree` 아이콘 옵션(열림/닫힘/하위 없음, 옵션 미사용 DOM 동일), 서비스 규칙(순환·inUse·중복명·parentInactive), 훅·서비스 계약, 기존 F1Tree 사용 화면 테스트 회귀.
- 정적: 백엔드 `mvn test`와 `javac --release 8` 호환, 프론트 `tsc -b`·`npm run lint`.
- 통합: DB 적용 후 실서버 + 브라우저(375/768/1280px)에서 등록·편집·사용안함·차단 메시지 확인, 스크린샷 `docs/result/20261119/hr-department/screenshots`.

## 6. 부서 선택 도움창 (공통, `shared/components/department-picker`)
- 용도: 다른 업무 화면이 부서를 고를 때 쓰는 공통 팝업. `CommonDialog` 안에 부서 검색 입력과 폴더형 `F1Tree`(회사 노드 + 부서)를 둔다.
- 사용: `<DepartmentPickerDialog open onClose onChange={(option) => …} selectedId? title? />`. `option`은 `{ departmentId, departmentNm, departmentPath }`(경로는 "생산팀 > 생산1팀", 회사 제외).
- 동작: 여는 즉시 `GET /api/v1/hr/departments?includeInactive=false`(읽기 전용, 로그인 사용자 누구나)를 호출한다. 부서를 클릭하면 선택되고 닫힌다. **회사 노드는 선택할 수 없고** 클릭하면 안내만 보인다. 사용안함 부서는 보이지 않는다. 검색은 부서명 포함 여부로 일치한 부서와 그 상위 부서(경로)만 남긴다. `selectedId`는 "현재 선택: 경로" 안내에만 쓴다. 선택은 한 번만 전달한다(부모가 선택에 반응해 다시 그려져도 같은 선택이 반복 호출되지 않도록 가드, 회귀 테스트 포함).
- 별도 API는 만들지 않는다(기존 목록 API 재사용, 경로는 프론트에서 계산).
- 후속: 부서를 고르면 사원을 조회해 사원을 선택하는 도움창은 사원등록(2단계)에서 같이 만든다.
