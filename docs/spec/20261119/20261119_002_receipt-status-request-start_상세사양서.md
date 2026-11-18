# 입고현황 요청 시작 상세 사양

- 목록 identity는 filters/retryRequest 참조다. 최초 undefined sentinel을 사용해 초기 비어 있지 않은 조건도 첫 commit부터 처리한다.
- identity가 달라지면 기록하며 유효 filters에서만 기존 start/hasLoaded=false/error=''와 일반 loading=true를 적용한다. quiet는 마지막 실제 시작 version과 다른 새 quiet 요청일 때뿐이다.
- null 조건은 요청/시작 상태 갱신 없이 마지막 실제 시작 version을 보존한다. quiet 완료 후 조건만 바뀌면 일반 로딩이며, null 중 증가한 quiet version은 재개 때 기존처럼 quiet다. 기존 행은 시작/실패 시 삭제하지 않는다.
- 상세 identity는 selectedId/refreshToken이다. null은 identity만 기록하고 그 외 값에서 첫 commit부터 loading=true/error=''를 게시한다. 같은 ID 무요청·재조회 중 기존 item 유지·닫기/재열기·active cleanup은 그대로다.
- 같은 파일의 useMaterialReceiptStatusSearch 전체 구현·default/status/session 계약은 변경하지 않는다. API/서비스/타입·반환값/이벤트 함수·UI/JSX/CSS·수정/취소/마감 보호도 그대로다. render ref 읽기/쓰기, 타이머/억제를 추가하지 않는다.

## 검증

- 실제 목록 훅 최초/지연 조건2개와 상세1개에서 첫 commit의 비로딩 RED3를 구현 전에 확인한다. deferred GET으로 quiet/version/cancel과 상세 no-op/재열기를 검증한다.
- 기존 현황11개와 등록/매입마감 회귀를 유지한다.3폭 native는 실제 훅의 합성 probe이며 전체 업무 화면 검증이 아니다.
- 검증 결과 Oxc71→69 제거2/추가0이다. 같은 파일의 search 초기화 진단1개를 숨기지 않았으며, 미사용 import 제거로 바뀐 해당 진단의 source offset 외에는 같은 token/label이다. 다른 파일 진단은 전체 label까지 동일하다.
- backend/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다.
