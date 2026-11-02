# 통합검색 전용 페이지 구현 결과

근거: [작업지시서](../../../directions/20261102/20261102_005_통합검색_전용페이지_작업지시서.md), [계획서](../../../plan/20261102/20261102_005_통합검색_전용페이지_계획서.md), [상세사양서](../../../spec/20261102/20261102_005_통합검색_전용페이지_상세사양서.md).

## 변경 결과

기존 검색 아이콘/모달을 **우측 상단 직접 입력 → 통합검색 전용 페이지**로 변경했다. 사용자 참고 화면의 유형별 정보 계층을 적용하되 기존 ERP 테마와 헤더/사이드바를 유지한다.

- 헤더에 검색 필드와 버튼을 바로 표시한다. Enter/버튼으로 검색하며 trim 후 2~100자를 검증한다. 모바일에서도 필드를 숨기지 않고 헤더 다음 줄에 노출한다.
- 인증된 공통 `/search` 페이지에 전체 건수와 전체/메뉴/문서/공지 탭을 표시한다.
- 전체는 구분별 최대 5개와 더보기, 개별 유형은 10개씩 이전/다음 페이지를 제공한다. 개별 유형에서도 다른 유형과 전체 건수를 유지한다.
- 제목을 굵게, 메뉴 경로나 기존 문서/공지 메타데이터를 보조 정보로 표시한다. 제목의 검색어는 평문 기반으로 강조한다.
- `keyword/type/page`를 URL에 보존하여 새로고침/직접 링크/뒤로가기 시 같은 조건으로 조회한다. 새 검색은 전체/1페이지로 초기화한다. 같은 검색어를 다시 제출해도 결과를 갱신한다.
- 검색 전, 잘못된 조건, 로딩, 구분별 빈 결과, 오류/재시도를 구분한다. 과거 응답은 cleanup으로 무효화하고 이전 조건의 결과가 섞이지 않게 한다.
- Tab/Enter 및 탭 방향키/Home/End로 조작한다. 외부/잘못된 결과 이동 경로는 차단한다.
- 검색 페이지는 DB 메뉴 등록 없이 열린다. 다른 기본 메뉴의 제목/선택 표시를 사용하거나 검색 경로를 최근 사용 메뉴에 잘못 기록하지 않는다.

추천/인기 검색어, 정확도, 결과 내 재검색, 새로운 검색 대상은 추가하지 않았다.

## 구현 파일

| 파일 | 역할 |
|---|---|
| `frontend/src/shared/components/search/UnifiedSearch.tsx` | 공통 검색 폼, 헤더/결과 페이지 입력, 검증과 URL 이동 |
| `frontend/src/pages/search/UnifiedSearchPage.tsx` | URL 조건, 집계/개별 조회, 구분별 결과·강조·페이징·상태 |
| `frontend/src/pages/dashboard/DashboardPage.tsx` | 공통 검색 본문/제목, 반응형 헤더, 검색 페이지 최근 메뉴 제외 |
| `frontend/src/routes/AppRouter.tsx` | 인증된 `/search` 진입 |
| `frontend/tests/unified-search.test.tsx` | 신규 페이지/헤더/기존 서비스 회귀 20개 |
| `frontend/tests/app-router-not-found.test.tsx` | 공통 검색 경로/후행 slash 진입 회귀 및 기존 라우터 검증 |
| `frontend/tests/unified-search.browser.mjs` | 실제 ERP 앱에서의 반응형 검색 흐름 검증 |

기존 테마의 TextField 기본 margin이 폼 버튼과 어긋나지 않도록 검색 폼 안에서만 `margin="none"`을 적용했다. 다른 화면의 테마/필드 스타일은 바꾸지 않았다.

## 회귀 및 검증

| 항목 | 결과 |
|---|---|
| Vitest 타깃 | **26개 통과**: 검색 20개, 라우터 5개, 기존 공지 링크 회귀 1개. 이번 변경과 무관한 공지 테스트 38개는 선택 실행에서 제외 |
| production build | TypeScript + Vite 통과 |
| 변경 파일 lint | 오류 0. 기존 DashboardPage 경고 3개 유지, 신규 검색 파일 경고 없음 |
| Chromium 실제 앱 | **375/768/1280px 통과**: 업무 화면의 헤더 입력 → 전용 페이지 → 구분별 더보기 → 다음 페이지 → 새로고침 → 뒤로가기 → 새 검색 → 기존 공지 링크 |
| 레이아웃 | 각 너비에서 헤더/본문 검색 필드 직접 노출, 본문 및 페이지 가로 overflow 없음 |
| 요청 범위 | URL/새 검색/유형/페이지 복원, 전체 집계 유지, 같은 검색어 재제출, 이전 응답 배제, 잘못된 조건/경로 차단 |
| 코드 리뷰 | 이번 변경 범위에서 중요 문제 발견 없음 |
| diff whitespace | `git diff --check` 통과 |

초기 테스트에서 전용 페이지 모듈 미존재를 확인하고 구현했다. 추가 회귀로 탭 End 키가 선택을 바꾸지 않는 실패를 재현한 뒤 키보드 처리를 추가했다. `/search/` 진입 시 헤더 검색어가 비는 실패도 확인하고 헤더와 Dashboard의 경로 정규화를 맞췄다.

실행 명령(프런트 디렉터리):

```powershell
npx vitest run tests\unified-search.test.tsx tests\app-router-not-found.test.tsx tests\notice-page-local-updates.test.tsx --testNamePattern='unified search|AppRouter not found fallback|opens a different linked notice' --reporter=dot
npm run build
npm run lint -- src\shared\components\search\UnifiedSearch.tsx src\pages\search\UnifiedSearchPage.tsx src\routes\AppRouter.tsx src\pages\dashboard\DashboardPage.tsx tests\unified-search.test.tsx tests\unified-search.browser.mjs tests\app-router-not-found.test.tsx
node tests\unified-search.browser.mjs
```

브라우저는 기존 확인된 `http://127.0.0.1:4173` S-ERP 서버를 재사용했다. 전용 테스트 HTML이 아니라 실제 App/AppRouter/DashboardPage를 사용하며 모든 API 응답과 인증값은 합성 fixture다. 실제 사용자·테넌트 행을 조회하지 않았다. 운영 DB 검색의 end-to-end 검증을 의미하지는 않는다. 기존 개발 서버는 종료하지 않았다.

기존 공지 테스트 실패는 [초기 결과 문서](../unified-search/README.md)의 기준 코드 비교 기록을 유지한다. 이번에는 해당 공지 구현을 추가 수정하지 않았고, 검색 결과 공지 링크 회귀만 재검증했다. 전체 테스트가 모두 통과했다고 판단하지 않는다.

## DB 및 영향 범위

**백엔드·API 데이터 계약·SQL·스키마 변경 없음.** 기존 검색 서비스/타입과 권한·테넌트 경계를 그대로 재사용한다. 프런트 UI 전환만 수행했으므로 이번 작업에서 DB MCP 재조회나 migration/rollback 생성은 하지 않았다. 이전 API 구현의 MCP 확인 근거는 초기 결과 문서에 유지한다.

다른 작업의 종합현황/문서 피드/문서 테스트/로그 변경은 보존했다. 요청되지 않은 커밋이나 별도 서버 실행은 하지 않았다.

## 스크린샷

| 너비 | 전체 결과 | 공지 2페이지 |
|---|---|---|
| 375px | [전체](screenshots/unified-search-page-375px.png) | [공지](screenshots/unified-search-notice-375px.png) |
| 768px | [전체](screenshots/unified-search-page-768px.png) | [공지](screenshots/unified-search-notice-768px.png) |
| 1280px | [전체](screenshots/unified-search-page-1280px.png) | [공지](screenshots/unified-search-notice-1280px.png) |

작업지시서 → 계획서 → 상세사양서 → 구현, 최소 변경, 기존 권한/계약 유지, 검증, 결과 문서/스크린샷, DB 변경 불필요 여부를 확인했다.

## 후속: 상단 검색 검증 문구 제거

근거: [006 사양](../../../spec/20261102/20261102_006_검색_빈값_표시_상세사양서.md).

우측 상단 검색창에서만 검증 안내 문구를 제거했다. 빈값/공백/잘못된 길이를 제출하면 빨간 테두리와 aria-invalid는 유지하고 이동·조회를 하지 않는다. 입력하면 오류 표시를 해제한다. **결과 페이지 검색창은 기존 안내 문구를 유지한다.** 안내 문구로 헤더 높이와 줄 배치가 달라지던 원인을 header variant의 helperText만 숨겨 해결했다.

변경 전 상단 안내 문구가 남는 테스트 실패 2개를 확인했다. 변경 후 검색 테스트 22개, build, 변경 파일 lint를 통과했다. 실제 앱 Chromium 375/768/1280px에서 빈 상단 필드 제출 시 빨간 테두리, 문구 부재, 헤더 높이 불변 및 결과 페이지 안내 유지, 기존 검색 흐름을 확인했다. API/DB 변경은 없다.

빈값 제출 스크린샷: [375px](screenshots/unified-search-empty-header-375px.png), [768px](screenshots/unified-search-empty-header-768px.png), [1280px](screenshots/unified-search-empty-header-1280px.png).
