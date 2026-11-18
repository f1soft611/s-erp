# 영업 상세 요청 시작 상태 상세 사양

## 계약

- 수주/견적 상세 훅의 요청 identity는 기존 effect 의존성인 selected ID와 refreshToken이다. 두 값이 바뀌면 마지막 identity state를 갱신한다.
- 새 ID가 null이 아니면 첫 해당 commit부터 loading=true/error=''로 게시한다. null이면 identity만 기록하고 기존 닫기 상태/로딩 정책을 건드리지 않는다. 닫았다가 같은 ID를 재열 때도 새 요청 시작을 놓치지 않는다.
- 같은 활성 ID의 openDetail은 기존대로 추가 요청/강제 로딩을 만들지 않는다. 선택 ID가 없을 때 refreshDetail은 token만 바꾸고 요청/로딩을 만들지 않는다.
- 새 ID 열기의 기존 데이터 초기화, 재조회 동안 동일 ID 데이터 유지, 에러 문구·편집 모드·active cleanup·늦은 응답 무시를 유지한다.
- effect 서비스 호출·응답/오류/finally 처리·public return 타입과 이벤트 함수·서비스/API·UI/권한은 변경하지 않는다. render ref 읽기/쓰기, 타 컴포넌트 state 변경은 추가하지 않는다.

## 검증

- 실제 훅을 renderHook/layout observer로 관찰한다. 첫 open commit에서 loading=false인 실제 RED를 두 훅 모두 확인한 뒤 구현한다.
- deferred 서비스 응답으로 실패/재조회·같은 ID 무요청·닫기 후 같은 ID 재열기·취소된 이전 ID의 늦은 응답 무시·닫힌 재조회의 무요청을 확인한다.
- 두 실제 현황 페이지의 기존 통합 테스트를 유지한다. 브라우저 3폭은 실제 훅의 합성 probe이며 전체 업무 화면 검증으로 표현하지 않는다.
- backend/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다. 잔여 75개는 검증 전 예상이다.
