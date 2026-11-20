# 20261120_004 창고등록 담당자 선택에 사원 선택 도움창 연결 상세사양서

기준: [계획서](../../plan/20261120/20261120_004_warehouse-manager-picker_계획서.md), [작업지시서](../../directions/20261120/20261120_004_warehouse-manager-picker_작업지시서.md)

## 1. 창고 화면 (`pages/co/master/warehouse`)
- `담당자`(`managerUserId`) 칸: `type: 'code'`, 표시값은 `managerUserName`, `onOpenCodePicker`로 페이지가 사원 선택 도움창을 연다. 직접 값 변경(`onValueChange`)은 "사원 선택으로 담당자를 선택해 주세요." 오류로 막는다.
- 선택 결과 적용(같은 행에 한 번에 반영): `managerUserId = userId`, `managerUserName = userNm`, `departmentId = departmentId`(없으면 null), `departmentName = departmentNm`(없으면 빈 문자열).
- **선택 해제**: 도움창의 "선택 해제" 버튼을 누르면 `managerUserId = null`, `managerUserName = ''`, `departmentId = null`, `departmentName = ''`로 적용한다(담당부서도 함께 비움). 이전에 드롭다운에서 담당자를 비울 수 있었던 동작을 유지한다.
- `담당부서`는 지금처럼 읽기 전용이며 담당자 선택으로만 바뀐다.
- 저장 계약(`managerUserId`, `departmentId`)과 서버는 변경 없음. 화면 로드시 사용자 목록 조회(`GET /api/v1/warehouses/user-options`)는 호출하지 않는다.

## 2. 사원 선택 도움창 (`shared/components/employee-picker`) 보강
- 선택 속성 `onClear?: () => void`를 추가한다. 있으면 도움창 하단에 "선택 해제"(왼쪽)와 "취소" 버튼이 나타나고, 해제를 누르면 `onClear()` 호출 후 닫힌다. 없으면 이전과 같다(버튼 없음).
- 사원 더블클릭 선택, 전달 값은 [20261120_003](20261120_003_hr-employee-picker_상세사양서.md)과 같다.

## 3. 검증
- 도움창: `onClear`가 있을 때만 해제 버튼 표시, 누르면 호출·닫힘, 중복 호출 없음.
- 창고 칼럼: 담당자 칸이 `code` 타입, 선택 버튼이 페이지 핸들러를 호출, 직접 변경은 오류, 값 표시는 담당자명.
- 실서버·브라우저: 창고 등록 행 폼에서 담당자 선택 → 담당부서 자동 입력 → 저장 → 재조회, 해제 후 저장.
