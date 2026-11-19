# 배합비 원료 picker 대상 상태 작업지시서

- 잔여 경고 순차 처리 요청에 따라 WorkStandardFormulaTab의 render 중 column factory로 ref 접근 callback을 전달하는 진단 1건을 처리한다.
- [기존 작업지시서](../20261111/20261111_003_작업표준서_등록_레시피_화면_작업지시서.md)와 [배합비 사양](../../spec/20261111/20261111_003_작업표준서_등록_레시피_화면_상세사양서.md)의 셀 picker/선택 행 picker·필드 채움·취소·계산·disabled 동작을 유지한다.
- column factory는 callback을 즉시 실행하지 않는다. 이번 진단만으로 기존 런타임 오류를 주장하지 않는다.
- picker 대상 ref 2개와 열림 boolean 대신 nullable 대상 상태 1개를 사용한다. 선택 행은 rowId, 셀 편집은 applyPatch를 보관하고 닫기에서 null로 비운다. gridRef는 이벤트에서만 계속 사용한다.
- 대안인 단순 callback wrapper는 ref의 상태 소유권을 명확히 하지 못하며, effect로 넘기면 불필요한 비동기 단계가 생긴다. 상태 통합은 이미 존재하는 열림 갱신과 함께 처리하며 새 effect·화면·API를 추가하지 않는다.
- 계획 → 사양 → 기존 동작/집중 보존 회귀·lint RED → 최소 구현 → 실제 3폭/결과 → 선행 CI 완료 후 별도 커밋·푸시 순서다.
- F1Grid 공통 코드·컬럼 factory/계산식·서비스/API/DB·다른 경고는 수정하지 않는다.
