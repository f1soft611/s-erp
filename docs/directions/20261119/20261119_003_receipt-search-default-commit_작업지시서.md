# 입고현황 검색 기본값 commit 작업지시서

- 잔여 lint 연속 단위070이다. [원 지시서](../20261117/20261117_002_입고현황_화면_작업지시서.md)의 정상 기본 상태·기간 검색·입력/적용 분리·세션 복원·초기화를 유지한다.
-069에서 보존한 `useMaterialReceiptStatusSearch`의 기본값 초기화 effect 하나만 대상으로 한다. 목록/상세·서비스/API·UI·등록/취소/마감 보호는 변경하지 않는다.
- 선행 조사에서 `usePageSessionState`의 setState는 같은 소유 훅의 **React 원본 setter**이고 저장은 별도 passive effect임을 확인했다. 일반 setter와 저장/외부 callback을 혼동하지 않는다.
- 최초/지연 기본값 첫 commit RED2와 storage가 layout 전에 쓰이지 않는 회귀를 먼저 확인한다. 기본값이 있고 searchSession=null인 동안만 기존 snapshot/setter를 같은 소유 render guard에서 적용한다. 공통 세션 훅은 수정하지 않는다.
- 관련 회귀/정적/3폭 실제 훅 probe·결과/스크린샷·선행069 정확 CI 성공 후 별도 커밋/푸시 순서다.
