# 영업 현황 목록 요청 시작 상세 사양

## 요청 identity와 보존 계약

- 기존 effect 의존성 중 가변 identity는 filters/retryRequest 참조다. 초기 filters는 undefined sentinel과 비교하므로 초기 비어 있지 않은 조건도 첫 commit부터 시작 상태를 게시한다.
- identity가 바뀌면 기록한다. filters=null에서는 요청 시작·hasLoaded/loading/error·initialLoad를 갱신하지 않고 마지막 실제 시작 version도 보존한다.
- 유효 filters에서는 기존과 같이 `start()`, hasLoaded=false, error=''를 첫 commit에 적용한다. start는 같은 소유 컴포넌트의 state만 변경하며 useInitialLoadState의 ref/실패 분류 로직은 변경하지 않는다.
- `quiet && version !== 마지막 실제 시작 version`일 때만 기존 loading 값을 그대로 유지한다. quiet 완료 후 조건만 바뀌면 같은 version이므로 일반 로딩이다. null 상태에서 quiet version이 증가했다면 재개 시 기존처럼 quiet로 시작한다.
- 이전 행은 시작/실패 시 삭제하지 않는다. 성공/오류/finally와 늦은 응답 무시, 기존 event 함수/return 계약·검색/세션·수정 후 조용한 갱신은 그대로다.
- 상태 추적만 state로 바꾸며 ref를 render로 읽거나 쓰지 않는다. API/서비스/타입·화면 markup/CSS·공통 로딩 훅·권한은 변경하지 않는다.

## 검증

- 실제 두 훅/layout observer의 null→조회 첫 commit RED2 후 구현한다. 최초부터 조건이 있는 경우까지 parameter로 보강하고 정확한 기준선에서도 실패함을 확인한다. deferred GET으로 일반/quiet/quiet 뒤 조건 변경·취소된 응답·null 중 대기 quiet 요청을 검증한다.
- 기존 두 실제 현황 통합 테스트를 삭제/skip/완화하지 않는다. 3폭 native는 실제 훅 합성 probe이며 전체 화면 검증이 아니다.
- 검증 결과 Oxc75→73 제거2/추가0이다. 실제 label/token 대조와 기존 테스트/source byte 보존을 판정했다.
- backend/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다.
