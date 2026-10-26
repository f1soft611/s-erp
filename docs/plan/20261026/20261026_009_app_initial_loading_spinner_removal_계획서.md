# 앱 초기 진입 로딩 스피너 제거 계획서

## 목표

라우트 모듈 로딩 fallback과 대시보드 초기 메뉴 조회의 스피너를 제거하고, lazy loading 및 메뉴 로딩 게이트와 조회 완료 후 동작은 보존한다.

## 근거

- [작업지시서](../../directions/20261026/20261026_009_app_initial_loading_spinner_removal_작업지시서.md)
- [상세 사양서](../../spec/20261026/20261026_009_app_initial_loading_spinner_removal_상세사양서.md)
- [승인된 설계](../../superpowers/specs/2026-10-26-app-initial-loading-spinner-removal-design.md)

## 파일 및 책임

- `frontend/src/routes/AppRouter.tsx`: route `lazy()` / `Suspense` 구조는 유지하고 spinner fallback을 `null`로 교체한다.
- `frontend/src/pages/dashboard/DashboardPage.tsx`: 초기 로딩 분기에서 공통 스피너 import와 스피너 전용 박스를 제거한다. 메뉴 준비 전 렌더링 게이트는 유지한다.
- `frontend/tests/app-router-not-found.test.tsx`: 지연 메뉴 응답 통합 테스트에서 앱 진입 스피너 부재와 대시보드 콘텐츠 게이트를 검증한다.
- `docs/result/20261026/app-initial-loading-spinner-removal/`: 재현 조건, 수정 내용, 검증 결과와 브라우저 캡처를 기록한다.

## 구현 순서

### 1. 실패하는 회귀 검증

- [x] 기존 `/dashboard` 지연 메뉴 응답 테스트에서 route component가 로드된 뒤 메뉴 API 응답을 resolve하기 전 `progressbar`가 없음을 확인한다.
- [x] 메뉴 응답 전 `종합현황` 헤딩도 아직 렌더링되지 않음을 확인한다.
- [x] 테스트 인증 만료 시각은 API 클라이언트의 refresh buffer보다 충분히 뒤로 설정하고, 지연 callback이 등록될 때까지 조건 기반 대기를 사용한다.
- [x] 성공 응답은 접근 권한이 있는 자식 메뉴를 포함해 대시보드 제목을 실제로 렌더링하도록 구성한다.
- [x] 기존 테스트를 실행해 현재 스피너 때문에 실패함을 확인한다.

### 2. 최소 구현

- [x] `AppRouter.tsx`에서 `AppLoadingSpinner` import를 제거하고 Suspense fallback을 `null`로 설정해 route lazy loading은 유지한다.
- [x] `DashboardPage.tsx`에서 `AppLoadingSpinner` import와 초기 메뉴 대기 전용 중앙 정렬 박스를 제거한다.
- [x] 기존 메뉴 준비 후 사이드바/본문 subtree를 `menusLoading`일 때만 렌더링하지 않도록 둔다. 새로운 문구, 스켈레톤, 대체 표시를 추가하지 않는다.
- [x] 메뉴 fetch, route validation, 에러/재시도 로직은 수정하지 않는다.

### 3. 검증 및 결과 문서

- [x] `cd frontend; npm run test -- tests/app-router-not-found.test.tsx`
- [x] `cd frontend; npm run build`
- [x] 기존 4173 브라우저에서 메뉴 응답 대기 화면을 확인하고 375px, 768px, 1280px 캡처를 저장한다.
- [x] `git diff --check`를 실행하고 결과 문서에 요청, 변경 범위, 테스트, 빌드, 화면 확인을 기록한다.

## 구현 계획 링크

세부 작업 체크리스트는 [Superpowers 구현 계획](../../superpowers/plans/2026-10-26-app-initial-loading-spinner-removal.md)을 따른다.
