# F1-Grid 로딩 스피너 시인성 정합 상세사양서

## 관련 문서

- 작업지시서: [20261026_002_f1-grid_spinner_visibility_작업지시서.md](../../directions/20261026/20261026_002_f1-grid_spinner_visibility_작업지시서.md)
- 계획서: [20261026_002_f1-grid_spinner_visibility_계획서.md](../../plan/20261026/20261026_002_f1-grid_spinner_visibility_계획서.md)
- 설계: [F1-Grid 로딩 스피너 시각 정합성 설계](../../superpowers/specs/2026-10-26-f1-grid-loading-spinner-design.md)

## 1. 적용 범위

공통 `F1Grid`의 loading 오버레이 시각 스타일만 변경한다. `F1Tree`는 기존 위임 경로를 유지하고 별도 로딩 UI를 추가하지 않는다. 화면별 loading 전달, 네트워크 상태, 저장 상태 및 로딩 종료 흐름은 그대로 둔다.

## 2. 스피너 시각 계약

- `CircularProgress` 크기는 34px로 한다.
- MUI `CircularProgress` 기본 두께와 기본 테마 색상을 사용한다. 두께를 prop으로 덮어쓰지 않는다.
- 스피너는 그리드 오버레이의 수평·수직 중앙에 둔다.
- 문구, 로고, 추가 아이콘이나 스피너 확대는 하지 않는다.

## 3. 오버레이

- 기존 absolute inset 0 배치, stacking order 및 pointer event 차단을 유지한다.
- 배경은 MUI theme `background.default`를 `alpha(..., 0.84)`로 표현한다.
- 오버레이는 그리드 높이/너비 안에서만 렌더링하고 그리드의 높이·스크롤 규칙을 바꾸지 않는다.
- `aria-live="polite"` 및 Grid root의 기존 `aria-busy` 계산을 유지한다.

## 4. 회귀 검증

- loading 시 `aria-busy="true"` 및 `f1-grid-loading-overlay`를 확인한다.
- progressbar 크기가 34px이고 SVG circle의 stroke width가 MUI 기본값 `3.6`인지 확인한다.
- light theme의 `background.default` `#f4f7fb`를 alpha 0.84로 합성한 `rgba(244, 247, 251, 0.84)`가 오버레이 배경으로 적용되는지 확인한다.
- loading 종료 후 오버레이와 `aria-busy`가 제거되고 `DASH` 행 편집이 가능해지는지 확인한다.
- 375px, 768px, 1280px에서 실제 브라우저 렌더링과 페이지 가로 스크롤을 확인한다.

## 5. DB/API 영향

없음. 프론트엔드 공통 UI, 관련 테스트, F1-Grid 문서 및 작업 결과만 변경한다.
