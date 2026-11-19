# 구매요청현황 시작 상태 작업지시서

- 잔여 lint 연속 단위072다. [원 화면 지시서](../20261112/20261112_003_구매요청현황_화면_작업지시서.md)의 검색/세션·번호 상세·등록 폼 공유·요청/확정 편집 보호를 유지한다.
- `usePurchaseRequestStatus.ts`의 search/list/detail 요청 시작 상태만 대상으로 한다. 검증한 동일 owner session setter/passive 저장과 목록 quiet 마지막 실제 시작 version·상세 ID/token guard를 적용한다.
- 실제 search 최초/지연 RED2, list 최초/지연 RED2, detail 첫 commit RED1을 먼저 확인한다. 기존 서비스/등록/확정 회귀와 정적/3폭 실제 훅 probe·결과/PNG6 후, 선행071 정확 CI 성공을 확인하고 별도 커밋/푸시한다.
- API/서비스/공통 훅·Page/Grid/JSX/CSS·수정/확정/삭제/저장 계약은 바꾸지 않는다. 원 문서의 DB/API 신규 구현을 재실행하지 않는다.
