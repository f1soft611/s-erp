# 20261120_005 사원등록 공통 행 폼 전환 상세사양서

기준: [계획서](../../plan/20261120/20261120_005_hr-employee-common-form_계획서.md), [작업지시서](../../directions/20261120/20261120_005_hr-employee-common-form_작업지시서.md)

## 1. 백엔드 일괄 저장
`POST /api/v1/hr/employees/save-batch` — 테넌트 관리자 전용. 요청:
```json
{ "employees": { "insertedRows": [ { "userId": "new-employee-…", "userNm": "…", … } ],
                 "updatedRows":  [ { "userId": "5", "userNm": "…", … } ], "deletedRows": [] } }
```
- 각 행은 기존 사원 저장 요청(`EmployeeSaveRequestVO`: 사번·이름·부서·직위·… ·`realUserAt`·`loginCode`·`initialPassword`·`photoImage`)에 요청 행 ID `userId`(문자열)를 더한 것이다. `photoImage`가 없으면(null) 사진은 그대로, 빈 문자열이면 삭제, 값이 있으면 교체(기존 규칙).
- 삭제 행이 있으면 400 "사원은 삭제할 수 없습니다. 퇴사일을 입력해 퇴직 처리해 주세요."
- 수정 행의 `userId`는 양의 정수 문자열이어야 하고, 요청 안의 행 ID는 중복될 수 없다(400).
- 하나의 `@Transactional`에서 등록 행 → 수정 행 순서로 기존 `EmployeeService.createEmployee/updateEmployee`를 호출한다. 하나라도 실패하면 전체 롤백하고, 오류 메시지는 `"<사원명>: <원래 메시지>"`로 돌려준다(HTTP 상태는 원래 오류 유지: 400/404/409).
- 응답 `item`: `employees`(저장된 `EmployeeVO` 목록, 등록 행 다음 수정 행 순서)와 `rowIdMappings`(요청 행 ID → 저장된 실제 `userId`).
- 기존 단건 API(`POST /employees`, `PUT /employees/{id}`)와 확인 API는 변경하지 않는다.

## 2. 공통 행 폼 옵션 (F1Grid)
`F1GridColumnFormOptions.inputType?: 'password'`: 행 폼의 텍스트 칸을 비밀번호 입력(`type="password"`)으로 렌더한다. 목록 셀 표시와 값 저장에는 영향이 없다. `F1-GRID.md`의 행 폼 옵션 설명과 API 참조(`F1GridColumnFormOptions.inputType`)를 갱신한다.

## 3. 프론트 `pages/hr/employee`
- 구조: `EmployeeManagePage`(창고 페이지와 같은 조립: PageHeader 액션 **사원 추가·조회·저장**, PageSearchArea 통합검색 + 상세검색 재직 구분, 저장하지 않은 변경 확인창), `components/EmployeeGrid`, `data/employeeGridData.ts`(컬럼 정의·새 행·변환), `hooks/useEmployeeManage.ts`, `services/employee.service.ts`, `types/employee.types.ts`.
- 그리드는 `F1Grid`(`storageKey="hr-employee-list-v2"`)이고 `rowFormPlugin`으로 공통 행 폼을 쓴다. 연필 "정보 수정" 열은 공통이 자동으로 붙인다(이름 링크·전용 상세 열 제거). 행 폼 제목은 "사원 등록"/"사원 정보 수정", 수정 폼 상단 "대상: <사원 ID>"는 `form.targetField: 'userNm'`, `targetLabel: '사원'`으로 사원명을 보여 준다.
- 행 폼 섹션과 칸(순서대로):
  1. **기본 정보**: 사번(등록 행만 입력 가능, 라벨 "사번(비우면 자동 부여)", 수정 행은 읽기 전용 열), 이름*, 영문이름, 부서*(`code` 칸·부서 선택 도움창), 직위*(select), 직급(select), 성별(select), **근무형태(select, 필수 아님)**, 입사일*, 퇴사일, 휴직일, 복직일.
  2. **개인·연락 정보**: 생년월일, 생년월일 구분, 핸드폰, 자택전화, 개인이메일, 우편번호(`code` 칸·주소 검색), 주소(`code` 칸·같은 주소 검색), 상세주소.
  3. **내/외국인**: 내/외국인(select) — '외국인'이면 **외국인 정보** 섹션(국적, 취업기간만료일, 입국일, 체류기간 시작·종료, 근로계약 시작·종료)이 나타난다(`editable` 함수).
  4. **시스템 사용**: 사진(`image` 칸), 실사용자(checkbox, 계정이 있으면 읽기 전용), 로그인 아이디(실사용자이고 계정이 없을 때만, 비우면 사번), 초기 비밀번호(`inputType: 'password'`, 같은 조건, 목록에는 숨김 열).
- **필수 검증**: `required`인 칸(이름·부서·직위·입사일)과 `validate` 규칙(사번 형식, 개인이메일, 퇴사일≥입사일, 복직일≥휴직일, 로그인 아이디 형식, 초기 비밀번호 8자 이상)이 공통 폼의 방식대로 **해당 칸을 빨간 테두리 + 안내 문구로 표시**하고 첫 오류 칸으로 포커스하며 상단 메시지 영역에도 표시한다. 근무형태에는 필수 표시(*)가 없다.
- 목록 열(화면에 보이는 순서): 사진, 사번, 이름, 영문이름, 부서, 직위, 직급, 성별, 입사일, 퇴사일, 재직상태(읽기 전용), 근무형태, 핸드폰, 자택전화, 이메일, 우편번호, 주소, 실사용자, 로그인 아이디. 퇴직 행은 흐리게 보인다. 목록에 없는 칸은 행 폼에서 보고 고친다.
- 저장: 페이지의 **저장** 버튼이 `grid.validate()` 후 변경 행을 일괄 저장 API로 보내고 결과를 `acceptSavedRows`로 반영한다. 사진은 원본과 달라진 행만 `photoImage`를 보낸다(삭제는 빈 문자열). 부서 ID·직급 ID는 숫자로 변환한다. 서버 오류(400/404/409)는 상단 메시지 영역에 표시한다.
- 권한: 등록·수정은 테넌트 관리자 + 메뉴 권한이 있을 때만, 없으면 조회 전용(공통 행 폼의 `onBeforeApply`).
- 제거: `EmployeeFormDialog`, 전용 `EmployeeGrid`(읽기 전용), `EmployeePhotoField`, 입력 중 사번·로그인 아이디 중복 확인 호출(서버 확인 API는 유지).

## 3-1. 구현 중 확정한 사항
- **근무형태는 서버도 필수가 아니다.** 화면에서만 필수를 풀면 서버가 "근무형태을(를) 선택해 주세요."로 거절한다. `EmployeeServiceImpl`이 근무형태를 선택 입력으로 처리하고(비우면 null 저장, 값이 있으면 공통코드 검사) 매퍼의 `employment_type_code`에 `jdbcType=VARCHAR`를 지정했다(DB 컬럼은 이미 null 허용, 스키마 변경 없음).
- **저장 검증은 변경한 행만 한다.** 기존 사원 중 부서·직위·입사일이 비어 있는 이전 데이터가 있으면 `grid.validate()`가 그 행들까지 오류로 만들어 다른 사원의 저장이 막혔다. 공통 그리드 `validate`에 옵션 `{ changedOnly: true }`(추가·수정한 행만 검증)를 추가하고 사원 저장이 사용한다(F1-Grid 문서·API 참조 갱신). 서버 검증은 그대로 최종이다.
- 일괄 저장 응답 오류 메시지 예: `공통폼점검: 이미 사용 중인 사번입니다.`(상단 메시지 영역, 변경 내용 유지, 서버에는 아무것도 남지 않음).

## 4. 검증
- 백엔드: 일괄 저장(등록·수정 순서와 ID 매핑, 삭제·잘못된 ID·중복 ID 거부, 오류 접두와 상태 유지, 빈 요청), 컨트롤러(관리자 전용, 오류→400).
- F1Grid: 행 폼의 `inputType: 'password'`가 비밀번호 입력으로 렌더된다.
- 프론트: 컬럼 규칙(필수·`validate`·조건부 `editable`·근무형태 필수 아님), payload 변환(사진 변경 시에만 전송, 숫자 변환), 페이지(목록·재직 구분·검색, 행 폼에서 필수 오류 시 칸 오류 표시, 입력 후 저장 시 일괄 저장 호출, 권한 없음).
- 실서버·브라우저(375/768/1280px): 등록(계정·사진 포함)·수정·재조회, 필수값 비움 시 빨간 테두리, 연필·폼이 창고와 같은 모양.
