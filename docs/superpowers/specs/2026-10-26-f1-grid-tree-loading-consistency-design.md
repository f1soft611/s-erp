# F1-Grid/F1-Tree 로딩 표시 일관성 설계

## 배경

F1Grid는 공통 `AppLoadingSpinner`를 34px·1.8px 두께로 오버레이에 표시한다. F1Tree는 `loading`을 포함한 공통 Grid props를 F1Grid에 전달하므로 동일한 렌더링 경로를 사용한다. 이 전달 관계가 코드상 보장되지만, F1Tree의 로딩 회귀 테스트가 없어 후속 변경으로 표시가 달라지는 것을 직접 검증하지 않는다.

## 설계

- F1Grid와 F1Tree의 로딩 스피너는 동일한 공통 F1Grid 오버레이를 통해 표시하며 34px 크기와 1.8px 두께를 함께 사용한다.
- F1Tree에 별도 로딩 UI, 두께 설정 또는 오버레이를 추가하지 않는다. 기존 `gridProps` 위임 흐름을 유지한다.
- F1Grid의 중앙 오버레이, 테마 배경, 입력 차단, `aria-busy`, loading lifecycle은 변경하지 않는다.
- DashboardPage는 동일한 `AppLoadingSpinner` 컴포넌트를 사용하되 기존 기본 두께 3.6px를 유지한다.
- F1Tree를 loading 상태로 렌더링해 공유 오버레이, 접근성 상태, 34px 크기, 1.8px stroke를 검증하는 회귀 테스트를 추가한다.
- F1-GRID 안내 문서에 F1Tree가 F1Grid의 loading 오버레이와 동일한 1.8px 스피너를 사용함을 명시한다.

## 검증

- F1Tree loading 테스트에서 `aria-busy="true"`, `f1-grid-loading-overlay`, progressbar의 34px 크기와 `stroke-width="1.8"`을 확인한다.
- 기존 F1Grid spinner regression, 새 F1Tree regression, 공통 스피너 테스트를 실행한다.
- 프론트엔드 빌드를 실행하고 `git diff --check`로 변경분을 검사한다.

## 범위 제외

- DashboardPage의 3.6px 기본 두께 변경
- 로딩 호출부, API, 저장/조회 정책, F1Tree 상호작용 변경
- 별도의 tree loading overlay 또는 tree 전용 spinner 구현
- 백엔드, DB, API 계약 변경
