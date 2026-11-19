# 서버 날짜 callback commit 경계 작업지시서

- 잔여 refs 진단 중 useServerDateDefault의 render 중 callback ref 쓰기 두 건을 처리한다.
- suspend되어 commit되지 않은 render가 진행 중 요청의 callback을 바꾸는지 실패 테스트부터 확인한다.
- 최신 commit된 callback만 반영하고 기존 조회 횟수·사용자 날짜 우선·reload·실패·unmount 보호를 유지한다.
- 지시서 → 계획 030 → 사양 030 → RED → 최소 수정 → GREEN/관련 회귀 → 결과·작업별 커밋/push 순서다.
