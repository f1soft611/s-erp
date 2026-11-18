# 쪽지 대화 열기 의존성 작업지시서

- 근거: 잔여 lint 순차 처리 요청과 MessageInboxPage 알림 링크 effect의 openThread 누락 경고다.
- 범위: raw setter만 호출하는 applyDayPage와 기존 openThread를 useCallback으로 바인딩하고 링크 effect에 openThread를 명시한다.
- [알림·쪽지 사양](../../spec/20261030/20261030_005_공통알림_쪽지함_통합_상세사양서.md)과 [실시간 갱신 사양](../../spec/20261102/20261102_008_알림쪽지_실시간갱신_상세사양서.md)의 링크 해석·대화 요청·읽음·요청 소유권·답장 draft·이전 날짜/실시간 병합·오류 정책을 보존한다.
- 함수/effect 본문, ref 접근 위치, 요청 인자·서비스·상태·권한·UI/CSS·API/DB 계약은 변경하지 않는다.
- 계획 → 사양 → 기존 회귀/대상 lint RED → 최소 callback binding → 동일 회귀/정적 비교 → 실제 격리 화면/결과 → 별도 커밋·동기화 순서다.
