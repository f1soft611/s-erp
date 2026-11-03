# 최근 사용 메뉴 PC 유지 결과

## 요구사항 및 원인

- [작업지시서](../../../directions/20261103/20261103_003_최근사용메뉴_PC유지_작업지시서.md)
- [계획서](../../../plan/20261103/20261103_003_최근사용메뉴_PC유지_계획서.md)
- [상세 사양서](../../../spec/20261103/20261103_003_최근사용메뉴_PC유지_상세사양서.md)

기존 최근 메뉴는 `sessionStorage`에 저장되어 탭/브라우저 세션 종료 시 사라졌으며, `DashboardPage.handleLogout`도 최근 메뉴 상태를 명시적으로 초기화했다. 기존 문서의 세션 한정 정책을 이번 사용자 요청에 따라 PC·브라우저 영구 유지로 변경했다.

## 변경

- 최근 메뉴 키 `s-erp:recent-menu-history`는 유지하고 저장소를 `localStorage`로 변경했다.
- 초기 복원은 local 우선이며, 없거나 읽을 수 없는 경우 현재 session 기록을 읽어 이관한다. local 저장 성공 후 구 session 키만 제거한다.
- 로그아웃의 최근 메뉴 초기화를 제거했다. 공통코드 등 페이지 상태의 기존 세션 정책은 변경하지 않았다.
- 잘못된 JSON/자료 구조/항목을 무시하고 정상 메뉴 흐름을 유지한다.
- 최신 5건, 중복 제거, 재방문 시간 갱신, 최근 메뉴 클릭 이동, 검색 페이지 기록 제외와 UI는 기존 동작을 유지한다.
- 동일 PC의 같은 브라우저 프로필 및 서비스 주소(origin)에서 유지한다. PC 단위 기존 키를 유지했으며 계정별 분리나 서버 동기화는 추가하지 않았다.
- 브라우저 데이터 직접 삭제, 다른 브라우저/PC/origin, 시크릿 모드 종료 시에는 보존을 보장하지 않는다. 이미 사라진 과거 기록은 복구하지 않는다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 구현 전 신규 회귀 테스트 | 현재 메뉴 API/빈 로그인 공지를 가상 응답으로 준비한 뒤 6건 모두 실패 확인 |
| targeted Vitest | 신규 6건 + 기존 최근 메뉴 표시 1건 + 페이지 세션 3건 = 10건 통과 |
| `npm run build` | 통과 |
| 변경 파일 oxlint | 오류 없이 종료, 기존 효과/의존성 로직 관련 경고 4건 |
| 관련 파일 전체 Vitest | 13건 통과, 기존 사이드바 테스트 10건 실패 |
| 실제 Chromium | 이관, 6개 메뉴 방문 시 최신 5건, 재방문 중복 제거, 클릭 이동, 새로고침, 로그아웃/재로그인, 새 탭, 영구 저장 상태를 복원한 새 브라우저 컨텍스트 모두 확인 |
| 반응형 | 375/768/1280에서 최근 메뉴 5건 표시 및 페이지 전체 가로 넘침 없음 확인 |

관련 파일 전체 실행에서 실패한 기존 10건은 구현 전 실행에서도 실패했다. 로그인 화면 lazy 로딩에 대한 동기 조회, 현재 권한 메뉴 구조와 맞지 않는 공통 fixture, 빈 로그인 공지 응답 누락 및 기존 UI 기대값 불일치가 포함되어 있다. 이번 테스트는 신규 `persistent recent menus` 그룹 안에서 필요한 가상 응답만 보완했으며 기존 테스트/공통 fixture의 별도 정비는 범위 밖으로 남겼다. 전체 테스트가 통과했다고 주장하지 않는다.

실행 명령 (`frontend`):

```powershell
node node_modules\vitest\vitest.mjs run tests\dashboard-sidebar.test.tsx tests\page-session-state.test.tsx -t 'persistent recent menus|page session state|shows recent menu history'
node node_modules\vitest\vitest.mjs run tests\dashboard-sidebar.test.tsx tests\page-session-state.test.tsx
npm run build
npm run lint -- src\pages\dashboard\DashboardPage.tsx tests\dashboard-sidebar.test.tsx
```

실제 브라우저는 기존 `http://127.0.0.1:4173` S-ERP 개발 서버를 재사용했다. 모든 인증/메뉴/API 응답은 가상 데이터만 사용했고 실제 계정·테넌트 데이터는 조회하지 않았다. 새 탭에서는 sessionStorage가 비어 있음을 확인했다. 새 브라우저 컨텍스트 검증은 Playwright의 영구 저장 상태를 메모리로 전달하여 수행했으며 실제 사용자의 브라우저 프로필은 건드리지 않았다. 테스트용 Chromium은 종료했고 기존 개발 서버는 유지했다.

## 스크린샷

가상 메뉴 6개로 방문/재방문 및 재로그인 후 복원된 최근 5건을 표시한 화면이다.

- [375px](screenshots/recent-menu-375.png)
- [768px](screenshots/recent-menu-768.png)
- [1280px](screenshots/recent-menu-1280.png)

## 완료 점검

- 작업지시서 → 계획서 → 상세 사양서 → 테스트/구현 → 결과 및 스크린샷 순서 준수.
- 운영 코드 수정은 DashboardPage의 최근 메뉴 저장/복원·로그아웃 정책에 한정.
- 공유 페이지 상태 훅, 즐겨찾기 및 백엔드/DB 변경 없음. SQL·스키마 이력·DB MCP 조회는 해당하지 않음.
- 문서 정책과 구현 정합성 및 변경 diff 검토 완료. 기존 작업 중인 무관한 변경은 보존.
