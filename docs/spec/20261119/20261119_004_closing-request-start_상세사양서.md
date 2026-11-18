# 매입마감 검색/조회 시작 상세 사양

- 검색은 defaultValues 준비/session=null일 때만 같은 snapshot을 같은 owner state guard로 적용한다. 서버 입고일 종료일에서 파생한 closingMonth와 closeType=ALL, version1/validate/persistWhen/passive 저장을 유지한다.
- 유효 세션은 새 기본값/재열기에도 우선한다. 편집만으로 적용/저장값은 바뀌지 않고 applySearch/resetSearch의 기존 계약을 유지한다.
- 데이터 identity는 filters/retryRequest 참조다. 초기 undefined sentinel로 처음부터 유효 조건인 경우도 처리한다. 유효 filters에서만 기존 start/hasLoaded=false/error=''와 일반 loading=true를 첫 commit에 게시한다.
- quiet는 마지막 실제 시작 version과 다른 새 quiet 요청일 때뿐이다. filters=null 동안 마지막 실제 시작 version을 유지한다. quiet 후 filters 변경은 일반 로딩이며 중단 중 대기 quiet는 재개 때 기존 quiet다. 기존 두 데이터 집합은 시작/실패 시 삭제하지 않는다.
- Promise.all의 두 GET이 모두 끝난 동일 요청만 suppliers/rows를 함께 게시한다. 한쪽 완료만으로는 게시하지 않는다. cancelled/오류/finally와 dataVersion/return/event API는 그대로다.
- Page·Grid/편집/선택 초기화·서비스/API/타입·UI/JSX/CSS·마감/해제 저장·공통 session/default/initialLoad 훅은 변경하지 않는다. render ref/IO·타이머·경고 억제를 추가하지 않는다.

## 검증

- 실제 search 최초/지연 RED2 + 실제 data 최초/지연 RED2를 구현 전에 확인한다. 첫 layout storage write0과 half-pair 미게시·pair 원자 게시를 포함한다.
- 기존14개와 입고현황/등록 관련 회귀를 유지한다.3폭 native는 실제 훅 조합의 합성 probe이며 실제 Page/Grid/마감 저장 검증이 아니다.
- Oxc68→66 제거2/추가0이다. 같은 파일 진단0/다른 진단 전체 label 동일, source891파일 byte parity0을 확인했다.
- frontend state/sessionStorage 경계만 대상이며 backend/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다.
