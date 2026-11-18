# 배합비 원료 picker 대상 상태 상세사양서

[작업지시서](../../directions/20261118/20261118_053_formula-picker-state_작업지시서.md) → [계획서](../../plan/20261118/20261118_053_formula-picker-state_계획서.md)를 따른다.

| 상태/이벤트 | 유지할 계약 |
| --- | --- |
| 최초/닫기 | 대상 null, dialog 닫힘 |
| 셀 코드 picker | 기존 applyPatch를 대상으로 보관하고 dialog 열기 |
| toolbar 원료 선택 | 기존 선택 1행의 rowId를 대상으로 보관 |
| 원료 선택 완료 | rowId는 기존 grid.setCellValue, applyPatch는 기존 toFormulaMaterialPatch 호출 후 닫기 |
| 취소 | 행 데이터 변경 없이 대상 제거 |
| 다른 행에서 다시 열기 | 이전 대상 대신 새 대상만 변경 |
| disabled 전환 | 버튼/편집 금지·dialog 숨김, 해제 시 기존 열린 대상 복원 |
| 그 외 | 행 추가·선택 수·기준 생산량/1판 기준·합계·컬럼/화면 구조 그대로 |

대상 상태는 nullable rowId/applyPatch union 하나이며 함수 자체를 state updater로 전달하지 않고 객체 안에 보관한다. factory는 ref 없는 open callback을 받는다. 실제 행 갱신과 gridRef 접근은 선택 이벤트에 남기며 render/effect로 옮기지 않는다. 새 effect/공개 props/API/DB/의존성 변경은 없다.

기존 factory는 callback을 즉시 실행하지 않는다. 진단 1건을 기존 기능 장애의 증거로 해석하지 않는다. 실제 두 진입 경로/취소/재열기/disabled 보존 회귀와 lint RED/GREEN·3폭 브라우저·범위 대조로 검증한다.
