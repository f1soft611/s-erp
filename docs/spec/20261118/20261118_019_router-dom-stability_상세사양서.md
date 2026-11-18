# Router 현재 DOM 대기 상세사양서

- [계획서](../../plan/20261118/20261118_019_router-dom-stability_계획서.md)는 [작업지시서](../../directions/20261118/20261118_001_repository-remediation_작업지시서.md)의 전체 CI 후속이다.
- 변경은 app-router-not-found 테스트의 dashboard root heading 대기 한 곳으로 제한한다.
- 메뉴 로딩 중 NotFound/progressbar/heading이 없다는 기존 단언, 실제 지연 응답 및 alias 탐색을 그대로 유지한다.
- 메뉴 도착 후에는 현재 document의 종합현황 heading이 실제 visible인지 같은 waitFor callback에서 조회·단언한다.
- 원래 5초 조회 제한과 30초 testcase 제한, 전체 테스트 수·단언을 유지한다.
- 운영 UI·라우터·API·DB·의존성은 바꾸지 않으며 UI 스크린샷 대상이 아니다.
