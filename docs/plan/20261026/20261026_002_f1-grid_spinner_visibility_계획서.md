# F1-Grid 공통 로딩 스피너 계획서

## 관련 문서

- 작업지시서: [20261026_002_f1-grid_spinner_visibility_작업지시서.md](../../directions/20261026/20261026_002_f1-grid_spinner_visibility_작업지시서.md)
- 설계: [F1-Grid 로딩 스피너 시각 정합성 설계](../../superpowers/specs/2026-10-26-f1-grid-loading-spinner-design.md)

## 목적

F1Grid와 DashboardPage가 같은 34px 로딩 스피너 컴포넌트를 사용하도록 정리한다. 기본 두께는 DashboardPage의 기존 3.6px로 유지하고, F1Grid 오버레이에서만 1.8px를 사용해 그리드 스피너를 더 얇게 표시한다.

## 변경 파일과 책임

- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`: 오버레이 배경과 그리드 전용 스피너 두께를 유지한다.
- `frontend/src/shared/components/AppLoadingSpinner.tsx`: 34px 테마 색상 스피너와 기본 3.6px 두께를 재사용 컴포넌트로 제공한다.
- `frontend/src/pages/dashboard/DashboardPage.tsx`: 첫 접속 로더를 공통 컴포넌트의 기본 3.6px 사용으로 전환한다.
- `frontend/tests/app-loading-spinner.test.tsx`: 기본 3.6px 및 전달된 두께 렌더링을 검증한다.
- `frontend/tests/f1-grid.test.tsx`: 공통 loading 오버레이, 1.8px 두께, 배경색, 접근성 및 편집 복구를 검증한다.
- `frontend/tests/f1-tree.test.tsx`: F1Tree의 loading 전달 시 공통 오버레이와 34px·1.8px 스피너를 검증한다.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`: loading의 스피너 시각 계약을 설명한다.
- `frontend/src/pages/f1-grid-docs/data/f1GridApiReference.ts`, `f1GridDocs.ts`: 문서 포털의 loading prop 설명을 맞춘다.
- `docs/result/20261026/f1-grid-loading-spinner/`: 검증 결과와 브라우저 캡처를 기록한다.
- `docs/directions/20261026/20261026_002_f1-grid_spinner_visibility_작업지시서.md`, 본 계획서 및 상세 사양서는 작업 이력을 유지한다.

## 실행 순서

1. F1Grid 로딩 회귀 테스트의 stroke 기대값을 1.8px로 바꾸고 현재 구현에서 실패하는지 확인한다.
2. 34px 스피너의 기본 두께 3.6px를 제공하는 `AppLoadingSpinner`를 만들고 DashboardPage에서 기본값, F1Grid 오버레이에서 1.8px를 사용한다.
3. `background.default` alpha 0.84 오버레이와 기존 로딩/접근성/입력 차단 계약을 유지한다.
4. 공통 컴포넌트 단위 테스트와 F1Grid 회귀 테스트를 통과시킨 뒤 F1-GRID 안내 문서 및 인앱 참조 설명을 갱신한다.
5. 프론트엔드 빌드와 브라우저 뷰포트 검증을 수행하고 1.8px 스피너 캡처·결과를 기록한다.

## 검증

- 명령: `cd frontend; npm run test -- tests/app-loading-spinner.test.tsx`
- 명령: `cd frontend; npx vitest run tests/f1-grid.test.tsx -t "uses the thinner shared spinner"`
- 명령: `cd frontend; npx vitest run tests/f1-tree.test.tsx -t "uses the same loading spinner as F1Grid"`
- 명령: `cd frontend; npm run build`
- 브라우저: S-ERP F1-Grid 문서/테스트 화면에서 로딩 상태 확인, 375px·768px·1280px 캡처

## 완료 조건

- DashboardPage와 F1Grid가 같은 34px 공통 스피너 컴포넌트를 사용한다.
- DashboardPage 기본 두께는 3.6px, F1Grid 오버레이 두께는 1.8px이며 테마 기본 색상을 사용한다.
- 오버레이가 그리드 전체를 차단하며 테마 배경을 사용한다.
- 기존 F1Grid/F1Tree의 loading 전달·그리드 본문·상호작용 계약은 바뀌지 않는다.
- 관련 집중 테스트·빌드·브라우저 검증과 결과 문서가 존재한다.
