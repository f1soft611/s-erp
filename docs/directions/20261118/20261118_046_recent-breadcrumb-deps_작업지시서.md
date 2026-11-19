# 최근 메뉴 경로 의존성 작업지시서

- 근거: 잔여 lint 순차 처리 요청과 DashboardPage의 recentBreadcrumbItems 의존성 경고다.
- 범위: 기존 `recentBreadcrumbItems.join(' > ')`를 동일한 순수 지역 문자열로 계산하고 방문 기록 effect에 그 문자열 의존성을 명시한다.
- [최근 메뉴 PC 유지 사양](../../spec/20261103/20261103_003_최근사용메뉴_PC유지_상세사양서.md)의 저장 형식·최신 5건·중복 제거·복원/오류 정책과 기존 notice의 커뮤니티 경로를 보존한다.
- lastRecordedMenuRef의 signature·guard·갱신 위치, visitedAt, 정렬/저장, 라우팅·권한·JSX/CSS·공개 props·API/DB는 변경하지 않는다.
- 계획 → 사양 → 기존 회귀/대상 lint RED → 최소 문자열 binding → 같은 회귀/정적 비교 → 실제 격리 화면/결과 → 별도 커밋·동기화 순서다.
