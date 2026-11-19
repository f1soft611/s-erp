# 발주현황 시작 상태 상세 사양

- search는 기존 loadedDefaultValues와 status=ACTIVE를 합치는 useMemo를 유지한다. defaultValues 준비/session=null일 때만 같은 clone/snapshot/applySnapshot을 own-state guard에 옮긴다. version2·validate/persistWhen/passive 저장·입력/적용 분리·유효 세션 우선·최신 기간/정상 초기화를 유지한다.
- list는 filters/retryRequest 참조로 시작을 감지한다. undefined sentinel로 처음부터 유효 조건인 경우도 처리한다. 유효 filters에서만 start/hasLoaded=false/error=''와 일반 loading=true를 첫 commit에 게시한다.
- quiet는 마지막 실제 시작 version과 다른 새 quiet 요청일 때뿐이다. filters=null 중 마지막 version을 유지하며 대기 quiet는 재개 때 quiet, quiet 후 조건 변경은 일반 로딩이다. 기존 행·cancelled cleanup·성공/오류/finally를 유지한다.
- detail은 selectedId/refreshToken으로 감지한다. null은 identity만 기록하고 그 외 값에서 기존 loading=true/error=''를 첫 commit에 게시한다. 같은 ID 무요청·refresh 중 item 유지·닫기/재열기·active cleanup·view/edit/close mode를 유지한다.
- 요청은 effect, 저장은 공통 session 훅 passive effect에 남긴다. Page/공통 훅/서비스/API/타입·이벤트/반환값·Grid/수정/취소/입고대기마감/출력·JSX/CSS는 그대로다. render ref/IO·타이머·경고 억제를 추가하지 않는다.
- 실제 RED5 후 등록/현황/출력3파일·tsc/Vite/Oxc·기존21개 보존·source parity를 확인한다.3폭 native는 독립 훅 합성 probe이며 실제 Page/Grid/업무 저장이나 실서버 날짜 API 검증이 아니다.
- frontend state/sessionStorage 경계만 대상이다. backend/API/DB/의존성 변경과 DB MCP·스키마 스크립트 대상이 아니다.
