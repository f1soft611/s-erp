# 20261120_003 사원 선택 도움창 상세사양서

기준: [계획서](../../plan/20261120/20261120_003_hr-employee-picker_계획서.md), [작업지시서](../../directions/20261120/20261120_003_hr-employee-picker_작업지시서.md)

## 1. DB (DB MCP로 확인한 계약, 변경 없음)
`tb_user`(`employee_no`, `department_id`, `position_code`, `retire_dt`, `photo_image`, `use_at`), `tb_department`(`department_nm`, `sort_order`, `use_at`), 공통코드 `POSITION`(`tb_common_code_group.group_code`, `tb_common_code_item.item_code/item_nm/sort_order`). 스키마·SQL 스크립트 변경은 없다.

## 2. 백엔드
`GET /api/v1/hr/employee-picker?departmentId=&keyword=` — 로그인한 사용자라면 누구나 호출한다(관리자 전용 아님). 항상 현재 테넌트로 제한한다.

- `departmentId`가 있으면 그 부서에 **직접 소속된** 사원만, 없으면 전체(부서 미지정 포함).
- 사용 중(`use_at = 'Y'`)이고 퇴직하지 않은 사원만(퇴직일이 오늘 이하이면 제외, 휴직은 포함).
- `keyword`는 100자 이하이며 사원명·사번·직위명·부서명에 ILIKE로 적용한다(초과하면 400).
- 정렬: 부서(부서 트리가 펼쳐진 순서) → 직위(공통코드 정렬순번) → 사원명 → 사원 ID. 사원관리 목록과 같은 기준이다([20261120_008](20261120_008_hr-employee-rename-sort_상세사양서.md)).
- 응답 `resultList` 항목(`EmployeePickerVO`): `userId`, `employeeNo`, `userNm`, `departmentId`, `departmentNm`, `positionCode`, `positionNm`, `photoImage`. **연락처·주민번호·주소·이메일·로그인 정보는 포함하지 않는다.**
- 구현: `EmployeeService.listPickerEmployees(tenantId, departmentId, keyword)`, `EmployeeDAO.selectPickerEmployees`, `Employee_SQL_postgresql.xml`의 `selectPickerEmployees`, `EmployeePickerApiController`.

## 3. 프론트 `shared/components/employee-picker`
- `EmployeePickerDialog`(`CommonDialog`, 크게 `lg`): props `open`, `onClose`, `onChange(value: EmployeePickerOption)`, `selectedUserId?`, `title?`(기본 "사원 선택").
- 왼쪽 `F1Tree`(`employee-picker-tree-v1`): 회사 노드 + 사용 중인 부서(부서 선택 도움창과 같은 데이터). **회사 노드도 선택할 수 있고** 선택하면 전체 사원을 조회한다. 부서를 고르면 그 부서 사원만 조회한다. 기본 선택은 회사.
- 오른쪽 위 통합검색 입력, 아래 `F1Grid`(`employee-picker-grid-v1`, 읽기 전용): 사진, 부서명, 직위, 사번, 사원명. 행을 한 번 누르면 선택 표시, **더블클릭하면 선택이 확정**되어 `onChange` 호출 후 닫힌다. 키보드: 선택한 행에서 Enter로도 확정한다.
- 선택 속성 `onClear?: () => void`(20261120_004에서 추가): 주면 도움창 왼쪽 아래에 "선택 해제" 버튼과 오른쪽 "취소" 버튼이 나타나고, 해제를 누르면 `onClear()` 호출 후 닫힌다(선택과 해제는 한 번만 처리). 담당자처럼 비워 둘 수 있는 항목에서 쓴다. 없으면 이전과 같다.
- 전달 값 `EmployeePickerOption`: `departmentId`, `departmentNm`, `userId`, `positionCode`, `positionNm`, `employeeNo`, `userNm`. 부서가 없는 사원은 `departmentId`는 `null`, `departmentNm`은 빈 문자열이다.
- 로딩·오류 상태를 보여 주고(빈 목록은 표의 "데이터가 없습니다"만 보여 주고 별도 안내 영역은 두지 않는다. 오른쪽 영역 높이를 고정해 오류가 나도 도움창 크기가 변하지 않는다), 트리를 바꾸면 이전 요청은 무시한다. 좁은 화면(모바일)에서는 트리와 목록이 위아래로 쌓인다.

## 4. 검증
- 백엔드: 서비스(검색어 정리·길이 제한·부서/전체 분기·테넌트 필수), 매퍼 SQL 계약(테넌트·퇴직 제외·직접 소속·민감 컬럼 없음), 컨트롤러(관리자가 아니어도 조회).
- 프론트: 회사 클릭 전체/부서 클릭 소속만, 검색, 더블클릭 시 7개 값 전달 후 닫힘, 한 번 클릭은 확정하지 않음, 오류·빈 목록, 부서 없는 사원.
- 실서버·브라우저(1280/768/375px) 확인과 스크린샷.
