# 최근 메뉴 경로 의존성 상세사양서

[작업지시서](../../directions/20261118/20261118_046_recent-breadcrumb-deps_작업지시서.md)와 [계획서](../../plan/20261118/20261118_046_recent-breadcrumb-deps_계획서.md)에 따른 의존성 정합성 변경이다.

## 선택과 경계

권장안은 기존 join 결과를 primitive 문자열로 계산해 그대로 읽는 것이다. 배열 전체를 dependency로 추가하면 매 렌더마다 identity가 달라진다. 배열을 별도 useMemo로 감싸면 부모 경로 배열 등 새 dependency 관리가 필요해 범위가 커진다. primitive는 원래 값/구분자를 보존하면서 둘 다 피한다.

effect에 새 문자열 갱신 원인이 있더라도 기존 lastRecordedMenuRef의 `moduleId:menuId:path` guard를 그대로 유지하므로 같은 방문을 다시 기록하도록 바꾸지 않는다. render에서 ref·Storage·요청을 읽거나 갱신하지 않는다.

| 항목 | 보존 기준 |
| --- | --- |
| 일반 경로 | 모듈명 > 부모 경로명들 > 현재 메뉴명 |
| groupware notice | 기존 모듈명 > 커뮤니티 > 현재 메뉴명 |
| 방문 소유권 | 기존 signature/guard/ref 갱신·visitedAt 위치 그대로 |
| 메타데이터/같은 메뉴 | 중복 방문 기록·시각 갱신 없음 |
| 메뉴 이동/재방문 | 최신순·menuId 중복 제거·최대 5건 |
| 통합검색 | 최근 메뉴 기록하지 않음 |
| 복원/오류 | local 우선·구 session 이관·잘못된 저장값 복구·저장 오류 처리 그대로 |

운영 diff는 순수 선언 1곳, effect 값 참조 1곳, dependency 추가 1곳뿐이다. DashboardPage의 다른 state-effect 경고는 별도 검토 대상으로 남기며 helper/ref/lint 설정으로 숨기지 않는다. API/DB·서비스·계약·패키지·권한·UI 구조를 변경하지 않아 DB MCP·SQL 대상이 아니다.
