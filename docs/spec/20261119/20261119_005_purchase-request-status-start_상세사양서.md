# 구매요청현황 시작 상태 상세 사양

- search는 defaultValues 준비/session=null일 때만 같은 clone/snapshot/setter/applySnapshot을 own-state guard에서 적용한다. 기본값 전 편집 초기화·version1/validate/persistWhen/passive 저장·입력/적용 분리·유효 세션 우선·최신 default 초기화를 유지한다.
- list identity는 filters/retryRequest 참조다. 초기 undefined sentinel로 처음부터 유효 조건인 경우도 처리한다. 유효 filters에서만 기존 start/hasLoaded=false/error=''와 일반 loading=true를 첫 commit에 게시한다.
- quiet는 마지막 실제 시작 version과 다른 새 quiet 요청일 때뿐이다. filters=null 중 마지막 실제 시작 version을 유지한다. quiet 후 filters 변경은 일반 로딩이며 중단 중 대기 quiet는 재개 때 기존 quiet다. 기존 행은 시작/실패 시 삭제하지 않는다.
- detail identity는 selectedId/refreshToken이다. null은 identity만 기록하고 그 외 값에서 기존 loading=true/error=''를 첫 commit에 게시한다. 같은 ID 무요청·재조회 중 기존 item 유지·닫기/재열기·active cleanup/editor 상태를 유지한다.
- 요청은 effect에, 저장은 공통 session 훅의 passive effect에 남긴다. Page·공통 훅·서비스/API/타입·이벤트/반환값·Grid/수정/확정 보호·UI/JSX/CSS는 변경하지 않는다. render ref/IO·타이머·경고 억제를 추가하지 않는다.

## 검증

- 실제 search2/list2/detail1 RED5를 구현 전에 확인한다. 첫 layout write0·version1 snapshot·quiet/version/취소와 상세 같은 ID/재열기/늦은 응답 회귀를 포함한다.
- 기존 서비스/Page3개와 등록/확정 관련 회귀를 유지한다.3폭 native는 실제 훅의 합성 probe이며 실제 Page/Grid/업무 저장 검증이 아니다.
- Oxc66→63/같은 파일 진단0/다른 진단 전체 label 보존과 source parity는 실제 결과로 확정한다.
- frontend state/sessionStorage 경계만 대상이며 backend/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다.
