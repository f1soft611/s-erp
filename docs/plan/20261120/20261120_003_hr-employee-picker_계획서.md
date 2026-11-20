# 20261120_003 사원 선택 도움창 계획서

기준: [작업지시서](../../directions/20261120/20261120_003_hr-employee-picker_작업지시서.md)

## 구현 단위
1. **백엔드 API**: `GET /api/v1/hr/employee-picker`(부서 ID·검색어 선택). 기존 `let/hr/employee` 모듈에 조회 전용 VO·DAO·매퍼 구문·서비스 메서드·컨트롤러를 추가한다. 테스트를 먼저 쓴다.
2. **프론트 공용 컴포넌트**: `shared/components/employee-picker`(다이얼로그, 서비스, 타입, 유틸). 부서 트리는 부서 선택 도움창의 서비스·유틸(`fetchPickerDepartments`, `buildPickerRows`)을 재사용한다.
3. **문서·검증**: 사양서·결과, 브라우저 확인(실서버).

## 위험과 대응
- 기존 `GET /api/v1/hr/employees`는 관리자 전용이고 개인정보가 많아 쓸 수 없으므로 새 API를 만든다. 응답 항목을 코드와 테스트로 고정한다(연락처·주민번호·주소 제외).
- 사진 데이터가 목록에 포함되어 사원이 많아지면 응답이 커진다(사원등록 목록과 같은 방식). 지연 로딩은 후속 작업으로 남긴다.
- F1Grid는 행 더블클릭 콜백이 없다. 그리드를 고치지 않고, 행마다 붙는 `data-f1-grid-row-id`로 바깥 영역에서 클릭한 행을 찾는다(F1-Grid 문서 변경 없음).
- 모든 `F1Grid`·`F1Tree`에 고유 `storageKey`를 준다(`employee-picker-tree-v1`, `employee-picker-grid-v1`).
