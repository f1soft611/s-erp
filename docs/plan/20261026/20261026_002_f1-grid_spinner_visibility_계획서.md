# F1-Grid 로딩 스피너 시인성 정합 계획서

## 관련 문서

- 작업지시서: [20261026_002_f1-grid_spinner_visibility_작업지시서.md](../../directions/20261026/20261026_002_f1-grid_spinner_visibility_작업지시서.md)
- 설계: [F1-Grid 로딩 스피너 시각 정합성 설계](../../superpowers/specs/2026-10-26-f1-grid-loading-spinner-design.md)

## 목적

F1Grid의 공통 로딩 표시를 DashboardPage 첫 접속 로더와 같은 MUI CircularProgress 스타일로 맞추고, 반투명 테마 배경 오버레이로 가시성을 높인다.

## 변경 파일과 책임

- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`: 오버레이 배경과 스피너 기본 두께를 조정한다.
- `frontend/tests/f1-grid.test.tsx`: 공통 loading 오버레이, 크기, 배경색, 접근성 회귀를 검증한다.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`: loading의 스피너 시각 계약을 설명한다.
- `docs/result/20261026/f1-grid-loading-spinner/`: 검증 결과와 브라우저 캡처를 기록한다.
- `docs/directions/20261026/20261026_002_f1-grid_spinner_visibility_작업지시서.md`, 본 계획서 및 상세 사양서는 작업 이력을 유지한다.

## 실행 순서

1. 기존 로딩 테스트에 DashboardPage 기본 스피너와 동일한 크기·기본 두께, 84% 테마 배경 오버레이 및 loading 종료 후 행 편집 복구 검증을 추가한다.
2. 집중 테스트를 먼저 실행해 시각 계약 검증이 실패하는지 확인한다.
3. F1Grid의 명시적 `thickness={4}`를 제거하고, 오버레이 배경을 theme `background.default`의 alpha 0.84로 바꾼다.
4. 집중 테스트를 통과시킨 뒤 F1-GRID 사용 문서를 갱신한다.
5. 프론트엔드 빌드와 브라우저 뷰포트 검증을 수행하고 캡처·결과를 기록한다.

## 검증

- 명령: `cd frontend; npm run test -- tests/f1-grid.test.tsx`
- 명령: `cd frontend; npm run build`
- 브라우저: S-ERP F1-Grid 문서/테스트 화면에서 로딩 상태 확인, 375px·768px·1280px 캡처

## 완료 조건

- 스피너의 지름 34px, MUI 기본 두께 및 테마 기본 색상이 첫 접속 로더와 같다.
- 오버레이가 그리드 전체를 차단하며 테마 배경을 사용한다.
- 기존 F1Grid/F1Tree의 loading 전달·그리드 본문·상호작용 계약은 바뀌지 않는다.
- 관련 테스트·빌드·브라우저 검증과 결과 문서가 존재한다.
