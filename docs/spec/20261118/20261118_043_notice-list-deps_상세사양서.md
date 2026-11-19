# 공지 목록 의존성 선언 상세사양서

[작업지시서](../../directions/20261118/20261118_043_notice-list-deps_작업지시서.md)와 [계획서](../../plan/20261118/20261118_043_notice-list-deps_계획서.md)에 따른 선언 보완이다.

| 항목 | 보존 조건 |
| --- | --- |
| 일반/고정 목록 필터 | 기존 selectedNoticeFilter와 정규화 `|| undefined`, 요청 인자 그대로 |
| callback 갱신 | 기존 loadAllPinnedPosts가 같은 필터 값을 이미 관찰하므로 추가 갱신 조건 없음 |
| 분류명 effect | 기존 noticeGubunNames 변경에만 실효 재실행; setNoticeItems는 raw useState setter |
| 비동기 소유권 | requestGeneration, inFlightPage, 오류/refresh/quiet 정책 그대로 |
| 목록 유지 | 실패한 새로고침, 중복 요청, 페이징 재시도, 로컬 댓글/수정 상태 기존 계약 유지 |
| 화면 | 공개 props, JSX/CSS, 메뉴·본문·권한·기존 화면 동작 그대로 |

운영 diff는 dependency array 2곳의 원소 추가뿐이어야 한다. ref mirror, effect 우회, lint disable, callback wrapper나 공통 구조 개편을 추가하지 않는다. API·DB 계약/스키마는 변경하지 않아 DB MCP·SQL 대상이 아니다. 브라우저 fixture의 합성 데이터는 기존 프론트 테스트 형태만 사용하며 운영 API·개인 설정은 읽거나 변경하지 않는다.
