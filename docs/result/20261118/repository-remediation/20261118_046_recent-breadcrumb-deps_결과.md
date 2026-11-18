# 최근 메뉴 경로 의존성 결과

[작업지시서](../../../directions/20261118/20261118_046_recent-breadcrumb-deps_작업지시서.md) → [계획서](../../../plan/20261118/20261118_046_recent-breadcrumb-deps_계획서.md) → [상세사양](../../../spec/20261118/20261118_046_recent-breadcrumb-deps_상세사양서.md) 순서로 진행했다.

## 변경과 보존

기존 `recentBreadcrumbItems.join(' > ')`를 동일한 지역 primitive 문자열로 계산하고 방문 기록 effect에서 그 값과 dependency를 명시했다. 운영 diff는 선언·값 참조·dependency 3곳뿐이다. 매 렌더마다 identity가 바뀌는 배열을 dependency로 추가하지 않았다.

전체 소스/AST로 effect 5개의 본문·기존 dependencies가 binding 정규화 후 같음을 확인했다. 최근 방문 signature/guard/ref 갱신, visitedAt, notice 특례, 최신순/중복 제거/최대 5건, local/session 복원·저장 오류 정책·검색 제외, 다른 handler/JSX/CSS/공개 props를 바꾸지 않았다. API/DB·권한·패키지 계약도 그대로여서 DB MCP·SQL 대상이 아니다.

## 검증

| 항목 | 실제 결과 |
| --- | --- |
| 대상 lint RED | exhaustive-deps 0개 assertion이 기존 recentBreadcrumbItems 경고 1개로 실패 |
| runtime 기준선/수정 후 | 동일 dashboard-sidebar/data/page-session-state **3파일·28개씩 통과**, 실패·대기 0 |
| 실제 앱 회귀 포함 | 로그아웃/재로그인/재마운트 유지, session 이관, local 우선/5건, 잘못된 저장값 복구, 메뉴 이동/패널 |
| 전체 lint | **97 → 96**, 대상 deps 1개만 제거·새 진단 0 |
| 잔여 분류 | effect-state 83 / deps 5 / refs 8 |
| typecheck/build | `tsc -b`, `vite build` 각각 exit 0; 기존 큰 chunk 안내 유지 |
| 범위/일치 | 운영 1파일·3 binding 지점, frontend 890파일 root/소유 검증 workspace byte 일치 |

UTC/threads/worker 2로 실행했다. 기존 동작을 바꾸지 않는 값/의존성 정합성 변경이므로 소스 문자열을 재진술하는 영구 테스트는 추가하지 않았다. 세션 JSON/log와 [scope audit](screenshots/recent-breadcrumb-deps/scope-audit.json), [브라우저 수치](screenshots/recent-breadcrumb-deps/verification.json)를 보관했다.

## 실제 브라우저

[최근 메뉴 PC 유지 사양](../../../spec/20261103/20261103_003_최근사용메뉴_PC유지_상세사양서.md)을 기준으로 실제 DashboardPage·MemoryRouter·메뉴 service adapter·sidebar·테마/알림 provider를 사용했다. 합성 메뉴 7개와 메모리 Storage만 사용했으며 모든 API fetch는 합성 GET 응답으로 닫았다. 실제 저장된 세션/설정을 읽거나 쓰지 않았고 운영 요청 fallback은 없다.

| 폭 | 테마 context / 같은 메뉴 클릭 | 다른 메뉴 / 최근 버튼 복귀 | 캡처 |
| --- | --- | --- | --- |
| 375 | 추가 기록 0회, 기존 visitedAt 포함 전체 기록 동일 | 각각 정확히 1회, 부모 경로 보존 | [최근 메뉴](screenshots/recent-breadcrumb-deps/recent-375.png) |
| 768 | 추가 기록 0회 | 각각 1회, 기존 수동 패널 펼침 사용 | [최근 메뉴](screenshots/recent-breadcrumb-deps/recent-768.png) |
| 1280 | 추가 기록 0회 | 각각 1회 | [최근 메뉴](screenshots/recent-breadcrumb-deps/recent-1280.png) |

일반 저장 경로는 `Owned groupware > Owned parent > Owned second`였다. 여섯 종류 방문 후 최신 5건만 남고 재방문에도 5건/중복 제거를 유지했다. notice는 기존대로 `Owned groupware > 커뮤니티 > Owned notice`, `/search` 이동은 기록/visitedAt 변경 0회였다. [5건](screenshots/recent-breadcrumb-deps/limit-1280.png), [notice](screenshots/recent-breadcrumb-deps/notice-1280.png), [검색 제외](screenshots/recent-breadcrumb-deps/search-1280.png)를 캡처했다.

native click/Escape와 viewport만 사용했다. 문서 폭은 세 뷰포트와 같았고 알 수 없는 API 호출은 0개였다. PNG 6개/JSON 2개를 보관하고 소유 탭만 닫았으며 공유 서버는 변경·종료하지 않았다. 브라우저 fixture의 합성 제어 버튼은 제품 UI 변경이 아니다. 실제 인증/로그아웃은 위 기존 App 회귀로 검증했으며 직접 마운트한 브라우저 fixture가 인증 전체를 검증했다고 확대하지 않는다.

## 브라우저 관찰자와 공유 서버 제약

초기 DashboardPage import 실패를 조사하니 탭의 resource timing에 과거 `dashboardData.tsx?t=1794990756920` 404가 남았다. 실제 파일은 `dashboardData.ts`이고 HTTP 200이었다. 새 소유 탭의 import map에서 **그 정확한 과거 specifier만 현재 모듈로 연결**해 실제 현재 컴포넌트를 검증했다. query가 없는 alias만으로는 과거 timestamp specifier를 연결하지 못했으며, 정확한 key를 적용한 뒤 마운트했다. 제품 파일을 복제/복원하거나 공유 서버를 재시작하지 않았고 이 test-only alias를 제품 해결책으로 삼지 않았다.

관찰자는 즐겨찾기 버튼 문구를 포함하는 실제 treeitem 접근성 이름, 모바일 메뉴가 선택 뒤 자동으로 닫히지 않는 기존 흐름, 768px 패널 수동 펼침을 소스/DOM에 맞춰 보정했다. 자동 닫힘이나 역할명을 바꾸는 제품 수정 없이 세 폭의 전체 흐름을 통과했다. 초기 관찰 실패를 제품 동작 수정으로 덮지 않았다.

## 이전 CI와 잔여

이번 046의 정확한 SHA `02fe4825b90bf35c46713bd86f39a2d380f139e4`에 대한 [전체 CI 44326824974](https://github.com/f1soft611/s-erp/actions/runs/44326824974)를 별도로 확인했다. **226파일·2,678개 통과**, frontend-build/tests/lint/required 네 job 모두 success이며 status와 원본 로그의 마지막 집계를 대조했다. [원격 CI 근거](screenshots/recent-breadcrumb-deps/remote-ci.json)를 보관했고 이 실행 완료 뒤에만 다음 단위를 push한다.

[045의 정확한 SHA 전체 CI](20261118_045_archive-filter-deps_결과.md) **226파일·2,678개**를 네 job success와 원본 로그로 확인해 별도 기록했다. 이를 이번 046 소스의 전체 결과로 재사용하지 않으며 045 완료 뒤에만 다음 push를 진행한다.

최초 206개 중 110개를 제거했고 **96개 경고는 순차 처리 중**이다. 나머지 DashboardPage state-effect 2개는 별도 검토 대상으로 남겼다. 공식 호환 수정 경로가 없는 의존성 권고 2건은 [027 결과](20261118_027_dependency-remediation-boundary_결과.md)의 BLOCKED 상태로 유지한다. 기존 TreeProjection 3단계 및 자료실 모바일 보조정보 관찰도 이 단위에서 수정하지 않았다.

```text
fix(frontend): 최근 메뉴 경로 의존성 명시

- 기존 경로를 같은 primitive 문자열로 계산해 effect에 명시
- 방문 중복 방지·저장·라우팅·notice 경로 보존
- 관련 28개·실제 3폭 검증, lint 97→96
```
