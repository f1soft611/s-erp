# 쪽지 대화 열기 의존성 상세사양서

[작업지시서](../../directions/20261118/20261118_047_message-open-deps_작업지시서.md)와 [계획서](../../plan/20261118/20261118_047_message-open-deps_계획서.md)에 따른 의존성 정합성 변경이다.

## 선택과 경계

권장안은 기존 두 함수를 현재 캡처 값에 맞게 useCallback으로 바인딩하는 것이다. 매 렌더마다 새 openThread를 그대로 dependency에 추가하면 링크를 불필요하게 재해석할 수 있다. 링크 effect 안에 함수를 복제하면 수동 선택과 코드가 갈라진다. callback ref mirror로 경고만 피하는 방식도 채택하지 않는다.

applyDayPage의 캡처는 raw setter 3개뿐이다. openThread의 캡처는 그 안정적인 callback·showError·raw setter·기존 ref·모듈 함수다. 기존 ref는 event/async completion 안에서만 접근하며 render로 이동하지 않는다. 링크 effect에는 이미 showError가 있으므로 새 callback을 명시해도 관련 값의 실효 변경 조건은 늘리지 않는다.

| 항목 | 보존 기준 |
| --- | --- |
| 목록 대기 | loadingThreads 중 알림 링크 해석하지 않음 |
| 유효 messageId | 기존 resolve → 대화 GET 성공 → 읽음 처리 순서 |
| 같은 링크/context | 불필요한 resolve/open 재실행·대화 초기화 없음 |
| 다른 링크/선택 | 기존 request generation과 mounted/active guard 유지 |
| 실시간 갱신 | 기존 날짜 병합·이전 날짜·draft·스크롤 정책 그대로 |
| 오류/잘못된 링크 | 기존 메시지·요청 차단·오류 처리 그대로 |

운영 diff는 두 callback의 선언/닫기와 링크 effect dependency뿐이다. 요청·읽음·이벤트 발행·정렬·상태 초기값·공개 props·JSX/CSS·API/DB 계약은 바꾸지 않는다. 남은 effect-state 경고를 우회하지 않는다. API/DB 변경이 없어 DB MCP·SQL 대상이 아니다.
