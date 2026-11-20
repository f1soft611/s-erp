# 발주현황 시작 상태 작업지시서

- 잔여 lint 연속 단위073이다. [원 지시서](../20261113/20261113_002_발주현황_화면_작업지시서.md)와 현재 코드의 정상 기본값/version2 세션·공유 등록 폼·수정/취소/입고대기마감/출력 보호를 유지한다.
- `usePurchaseOrderStatus.ts`의 search/list/detail 시작 상태만 같은 owner guard로 전환한다. 최초/지연 search2/list2와 detail1 RED5를 구현 전에 확인한다.
- 기존 서비스/Page21개를 보존하고 등록/출력 관련 회귀·정적·3폭 실제 훅 probe/PNG6 후 별도 커밋/푸시한다. 선행072 정확 CI 성공 전 다음 push는 금지한다.
- 서비스/API/타입·공통 훅·Page/Grid/JSX/CSS·수정/취소/마감/출력·DB/의존성은 변경하지 않는다. 원문서의 과거 DB/API 구현을 재실행하지 않는다.
