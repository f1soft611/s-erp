# 공통 로딩 스피너 MUI 애니메이션 복구 작업지시서

## 요청 배경

조회 로딩 스피너의 선이 부분적으로 보이거나 끊겨 보이는 현상을 수정한다. 원인은 전역 CSS 오염이 아니라 `AppLoadingSpinner`의 component-local 스타일이 `.MuiCircularProgress-circle`에 `animation: none`과 사용자 정의 `strokeDasharray`를 적용해 MUI indeterminate 원호 애니메이션을 덮어쓴 것이다. MUI 기본 indeterminate spinner는 원호 길이가 변하면서 회전하는 것이 정상 동작이다.

## 작업 범위

- 공통 `AppLoadingSpinner`에서 custom `styled` wrapper, circle animation, `strokeDasharray` override를 제거하고 MUI indeterminate 애니메이션을 사용한다.
- MUI `CircularProgress`의 크기, 두께, 색상, 접근성 props 전달을 보존한다.
- 공통 기본값은 34px·2.4px, Dashboard 첫 접속 로더는 34px·3.6px, F1Grid/F1Tree는 34px·2.4px를 유지한다.
- 기본 MUI 원호 애니메이션에 대한 회귀 테스트, F1-Grid 문서, 날짜별 결과 문서와 브라우저 검증을 갱신한다.

## 제외 범위

- 조회/API 요청 시점이나 로딩 수명주기 변경
- 스피너 크기, 색상, 두께, 문구 또는 페이지 레이아웃 변경
- Skeleton 기반 로딩 표시 변경
- 백엔드, API, DB, 전역 테마 변경

## 완료 조건

1. 공유 스피너는 `variant="indeterminate"`의 표준 MUI `CircularProgress`를 렌더링한다.
2. MUI circle dash 및 root 회전 애니메이션이 모두 기본대로 동작하며 custom `animation: none` 규칙이 없다.
3. 기본/명시적 크기와 두께, 색상 및 접근성 props 전달이 유지된다.
4. Grid/Tree의 34px·2.4px 로딩 오버레이와 Dashboard 첫 접속 로더의 34px·3.6px가 보존된다.
5. 관련 테스트, 프론트엔드 빌드, 브라우저 확인 및 결과 문서가 완료된다.

## 검증 명령

```powershell
npm run test -- tests/app-loading-spinner.test.tsx
npx vitest run tests/f1-grid.test.tsx tests/f1-tree.test.tsx -t "matches the shared app spinner|same loading spinner as F1Grid"
npx vitest run tests/f1-grid-docs.test.tsx --testTimeout 15000
npm run build
git diff --check
```
