# 20261120_002 사원등록 주민등록번호 항목 숨김 상세사양서

기준: [계획서](../../plan/20261120/20261120_002_hr-employee-resident-no-hidden_계획서.md), [작업지시서](../../directions/20261120/20261120_002_hr-employee-resident-no-hidden_작업지시서.md)

## 1. 화면 (`pages/hr/employee`)
- 사원 등록·수정 팝업의 "개인·연락 정보"에서 **주민등록번호 입력칸을 제거**한다(입력·마스킹 표시·안내 문구 모두).
- "생일" → **"생년월일"**, "생일 구분" → **"생년월일 구분"**(양력/음력, 공통코드 `BIRTH_CALENDAR`)으로 라벨을 바꾼다. 동작·필수 여부는 그대로(선택 입력).
- 폼 값(`EmployeeFormValues`)에서 `residentNo`, `residentNoMasked`를 제거한다. `buildEmployeePayload`는 주민번호 13자리 검사를 하지 않고 요청 본문(`EmployeePayload`)에 `residentNo`를 포함하지 않는다.
- 조회 행(`EmployeeRow`)의 `residentNoMasked`는 서버 응답 계약이라 그대로 두되 화면에서 사용하지 않는다.

## 2. 백엔드·DB
- 변경 없음. 요청에 `residentNo`가 없으면 `putResidentNo`가 "미입력"으로 처리해 기존 암호문·해시·마스킹 값을 건드리지 않는다. 서버 암호화 키 환경변수는 주민번호를 저장할 때만 필요하므로 이제 설정하지 않아도 된다.
- 기존에 저장된 값이 있다면(점검 데이터 포함) DB에 그대로 남는다. 삭제가 필요하면 별도 작업으로 한다.

## 3. 검증
- `hr-employee-form`: 폼 값과 요청에 주민번호가 없음, 기존 검증(날짜 순서·사번·이메일) 유지.
- `hr-employee-page`: 수정 팝업에 주민등록번호 칸이 없고 생년월일 칸이 있으며 저장 요청에 `residentNo`가 없음.
- `tsc`, lint, `f1-grid-storage-keys`. 브라우저로 팝업 확인(스크린샷).
