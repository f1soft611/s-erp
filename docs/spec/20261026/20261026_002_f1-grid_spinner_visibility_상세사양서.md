# F1-Grid 공통 로딩 스피너 상세사양서

## 관련 문서

- 작업지시서: [20261026_002_f1-grid_spinner_visibility_작업지시서.md](../../directions/20261026/20261026_002_f1-grid_spinner_visibility_작업지시서.md)
- 계획서: [20261026_002_f1-grid_spinner_visibility_계획서.md](../../plan/20261026/20261026_002_f1-grid_spinner_visibility_계획서.md)
- 설계: [F1-Grid 로딩 스피너 시각 정합성 설계](../../superpowers/specs/2026-10-26-f1-grid-loading-spinner-design.md)

## 1. 적용 범위

모든 `frontend/src` indeterminate MUI `CircularProgress` 사용처가 `frontend/src/shared/components/AppLoadingSpinner.tsx`를 사용한다. 공통 컴포넌트는 MUI typed props를 전달하며 기본 34px 크기와 3.6px 두께, 기본 테마 색상을 유지한다. 기존 각 사용처의 size, thickness, color, accessible label, layout 및 conditional rendering은 동일하게 전달한다. F1Grid/F1Tree는 기존 공통 overlay를 유지하고 34px·2.4px spinner를 사용한다. `DashboardPage`는 기본값을 사용한다. 화면별 loading 전달, 네트워크 상태, 저장 상태 및 로딩 종료 흐름은 그대로 둔다.

## 2. 스피너 시각 계약

- 공통 컴포넌트 기본 `size`는 34px, `thickness`는 3.6px이며 MUI 기본 테마 색상을 사용한다.
- 기존 MUI default size에 의존한 사용처는 `size={40}`을 명시해 크기를 보존한다. 그 외에는 기존 size 값(16/18/20/22/24 등)을 전달한다.
- 기존 `color`, `aria-label` 및 나머지 MUI CircularProgress props를 동일하게 전달한다.
- F1Grid 로딩 오버레이는 공통 컴포넌트에 2.4px를 전달한다. F1Tree는 loading prop을 F1Grid에 전달하므로 별도 설정 없이 똑같은 34px·2.4px 스피너를 사용한다.
- 스피너는 그리드 오버레이의 수평·수직 중앙에 둔다.
- 문구, 로고, 추가 아이콘이나 스피너 확대는 하지 않는다.

## 3. 오버레이

- 기존 absolute inset 0 배치, stacking order 및 pointer event 차단을 유지한다.
- 배경은 MUI theme `background.default`를 `alpha(..., 0.84)`로 표현한다.
- 오버레이는 그리드 높이/너비 안에서만 렌더링하고 그리드의 높이·스크롤 규칙을 바꾸지 않는다.
- `aria-live="polite"` 및 Grid root의 기존 `aria-busy` 계산을 유지한다.

## 4. 회귀 검증

- loading 시 `aria-busy="true"` 및 `f1-grid-loading-overlay`를 확인한다.
- 공유 스피너 기본 렌더링 크기가 34px이고 SVG circle의 stroke width가 `3.6`인지 확인한다.
- 공통 컴포넌트가 지정된 size/color/label props를 보존하는지 확인한다.
- F1Grid 오버레이 progressbar 크기가 34px이고 SVG circle의 stroke width가 `2.4`인지 확인한다.
- F1Tree의 `loading` prop이 같은 공통 오버레이를 표시하고 progressbar 크기 34px, SVG circle stroke width `2.4`를 사용하는지 확인한다.
- light theme의 `background.default` `#f4f7fb`를 alpha 0.84로 합성한 `rgba(244, 247, 251, 0.84)`가 오버레이 배경으로 적용되는지 확인한다.
- loading 종료 후 오버레이와 `aria-busy`가 제거되고 `DASH` 행 편집이 가능해지는지 확인한다.
- 375px, 768px, 1280px에서 실제 브라우저 렌더링과 페이지 가로 스크롤을 확인한다.

## 5. 영향 범위

- 앱 소스의 indeterminate loading spinner는 공통 래퍼를 사용하되 기존의 각 크기 및 색상을 보존한다.
- DashboardPage의 첫 접속 로더는 기본 34px·3.6px 외형을 유지한다. Grid/Tree만 34px·2.4px를 사용한다.
- 전역 MUI theme, API 및 DB 계약과 로딩 시작/완료 정책은 변경하지 않는다.

## 6. DB/API 영향

없음. 프론트엔드 공통 UI, 관련 테스트, F1-Grid 문서 및 작업 결과만 변경한다.
