# Common Page Load Error Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox tracking.

**Goal:** 최초 필수 조회 실패에만 공통 본문 오류/재시도를 표시하고 기존 작업 내용은 유지한다.

**Architecture:** API fetch 실패는 명시적인 연결 오류로 정규화한다. `useInitialLoadState`는 필수 자원별 최초 성공을 기억하고 성공 이후 오류를 전체 본문 오류로 승격하지 않는다. `PageLoadBoundary`는 상단 헤더 아래에서만 오류 본문을 렌더링하며 재시도는 해당 자원의 기존 조회 함수를 호출한다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Playwright.

## Task 1: 공통 오류 분류 및 상태

Files:
- Modify: `frontend\src\shared\services\apiClient.ts`
- Create: `frontend\src\shared\services\apiErrors.ts`
- Create: `frontend\src\shared\hooks\useInitialLoadState.ts`
- Create: `frontend\src\shared\components\PageLoadBoundary.tsx`
- Create: `frontend\tests\page-load-boundary.test.tsx`
- Create: `frontend\tests\api-network-error.test.ts`

- [x] 무응답/HTTP 오류/인증/권한, 성공 0건, 재시도 중, 최초 성공 후 실패 테스트를 추가한다.
- [x] 새 파일 import 실패로 red를 확인한다.
- [x] `start()`는 retry 중 상태만 바꾸고 오류를 유지한다. `succeed()`는 최초 성공 latch를 설정하고 오류를 해제한다. `fail(cause)`는 최초 성공 이전의 오류만 본문 상태로 설정한다.
- [x] `ApiNetworkError`는 fetch 또는 본문 전송 실패만 감싼다. AbortError는 원형을 보존한다. HTTP 401/403/5xx는 `ApiResponseError.status`를 보존한다.
- [x] 공통 UI는 오류별 문구, 접근 가능한 재시도 이름, retry 중 중복 클릭 방지, 반응형 중앙 배치를 제공한다.

사용 계약:

```tsx
const initialLoad = useInitialLoadState();
// 기존 request id/active 검사 내부에서만 호출한다.
initialLoad.start();
try {
  const rows = await fetchRows();
  setRows(rows);
  initialLoad.succeed();
} catch (cause) {
  initialLoad.fail(cause);
  setError(cause instanceof Error ? cause.message : '조회 실패');
}
// PageHeader 다음 본문만 감싼다.
<PageLoadBoundary {...initialLoad} onRetry={retry} label="목록">
  {body}
</PageLoadBoundary>
```

## Task 2: 관리 화면

Files:
- `frontend\src\pages\settings\system\{modules,roles,warehouses,menus}\*Page.tsx`
- `frontend\src\pages\co\master\common-code\CommonCodeManagementPage.tsx`
- `frontend\src\pages\co\master\{customers,materials}\hooks\use*Management.ts`
- `frontend\src\pages\co\workflow\form\hooks\useDraftFormManagement.ts`
- 해당 `CustomerManagementPage`, `MaterialManagementPage`, `DraftFormManagementPage`.
- `frontend\src\pages\settings\system\roles\components\RoleManagementPanel.tsx`
- `frontend\tests\page-initial-errors.test.tsx`

- [x] 각 기존 필수 조회의 최신 응답 처리에 상태 전이를 추가한다. 페이지 본문을 boundary로 감싼다.
- [x] 재시도는 기존 필터를 그대로 사용한다. 메뉴관리 초기 모듈/권한/역할을 모두 재조회하며 아직 선택하지 않은 역할은 정상 상태다.
- [x] 기안양식은 행과 옵션의 두 초기 상태를 독립 관리한다. 하나의 성공으로 다른 오류를 지우지 않는다.
- [x] 실패 시 기존 rows를 삭제하는 모듈/역할/창고 분기를 제거한다. 명시적 폐기 흐름은 유지한다.
- [x] 역할관리의 확인 후 재조회는 성공 후에만 역할 편집 기준을 초기화한다. 저장 후 동기화 실패/재조회 실패/재시도에서 중복 PUT이 발생하지 않는 기존 회귀 테스트를 확인한다.
- [x] 모듈 테스트에 최초 실패→재시도→빈 성공, 성공 후 조회 실패 데이터 보존을 추가한다.

## Task 3: 그룹웨어·검색 기본값

Files:
- `frontend\src\shared\hooks\usePageSearchDefaults.ts`
- `frontend\src\pages\groupware\community\notice\hooks\useNoticeList.ts`, `CommunityNoticePage.tsx`
- `frontend\src\pages\groupware\community\archive\hooks\useArchive{List,Categories}.ts`, `ArchiveBoardPage.tsx`
- `frontend\src\pages\groupware\documents\status\hooks\useDocumentStatus{List,Search}.ts`, `DocumentStatusPage.tsx`
- `frontend\src\pages\groupware\documents\write\hooks\useDocumentWritePage.ts`, `DocumentWritePage.tsx`

- [x] 검색 기본값의 raw 오류 분류를 잃지 않도록 초기 상태를 반환한다.
- [x] 공지 기존 중복 오류 본문을 공통 UI로 교체한다. 최초 빈 성공 이후 실패를 전체 오류로 취급하지 않는다.
- [x] 자료실 목록/분류/기본 날짜 조회는 독립된 초기 상태를 사용하고 실패한 자원만 재시도한다.
- [x] 전자결재 목록·요약 초기 조회에 연결한다. 이후 필터/갱신 실패 때 배열을 삭제하지 않는다.
- [x] 문서현황의 조회 시작 시 rows 삭제를 제거하고 최신 요청 취소 처리는 유지한다.
- [x] 모달 편집/상세/추가 페이지 조회는 본문 전체 boundary로 승격하지 않는다.

## Task 4: 앱 초기 메뉴·내 정보

Files:
- `frontend\src\pages\dashboard\DashboardPage.tsx`
- `frontend\src\pages\dashboard\ProfileSettingsPage.tsx`

- [x] 초기 메뉴 실패도 공통 분류/UI로 통일한다. 기존 자동 1회 재시도 및 초기 스피너 미표시 정책은 유지한다.
- [x] 메뉴 실패가 잘못된 URL로 분류되어 404로 빠지지 않도록 오류 분기를 라우트 검증보다 먼저 처리한다.
- [x] 내 정보 초기 실패에 실제 재조회 함수를 제공하고 저장 오류는 기존 form 안에 남긴다.
- [x] API 초기 조회가 없는 수주 신규 작성/보안 설정/로그인/정적 종합현황/문서·Grid 예제/준비 중/404는 인위적인 네트워크 조회를 추가하지 않는다.
- [x] 병행 작업에서 추가된 `frontend\src\pages\sales\order\status\SalesOrderStatusPage.tsx`와 `hooks\useSalesOrderStatusList.ts`에도 동일 상태 계약을 연결한다. 검색 기본값과 최초 수주 목록 실패를 독립적으로 재시도하며 성공 후 rows는 보존한다.

## Task 5: 검증 및 결과

- [x] 핵심 Vitest를 1 worker로 실행한다:
  `vitest run tests\page-load-boundary.test.tsx tests\api-network-error.test.ts tests\module-management-page.test.tsx tests\use-notice-list.test.tsx tests\use-page-search-defaults.test.tsx tests\document-status-hooks.test.tsx --maxWorkers=1`.
- [x] 연결 페이지 관련 기존 테스트를 실행해 실패 원인을 확인한다. 신규 회귀와 기존 mock/기대값 실패를 구분한다.
- [x] `npm run build`, 변경 TS/TSX `oxlint --quiet`를 실행한다.
- [x] 기존 4173 서버를 재사용해 Chromium 375/768/1280px에서 공통 오류·재시도·정상 빈 성공·기존 내용 유지 및 가로 넘침을 확인한다.
- [x] `docs\result\20261027\shared-page-load-error`에 결과/스크린샷 및 적용·예외 범위를 남긴다.

요청되지 않은 커밋/푸시와 백엔드/DB 변경은 없다.

결과: [공통 최초 조회 실패 결과](../../result/20261027/shared-page-load-error/20261027_008_shared-page-load-error_결과.md).
