# 공통 로딩 스피너 MUI 애니메이션 복구 상세사양서

## 관련 문서

- 작업지시서: [20261026_007_f1-spinner_stable_arc_작업지시서.md](../../directions/20261026/20261026_007_f1-spinner_stable_arc_작업지시서.md)
- 계획서: [20261026_007_f1-spinner_stable_arc_계획서.md](../../plan/20261026/20261026_007_f1-spinner_stable_arc_계획서.md)
- 승인된 설계: [F1 Spinner Stable-Arc Design](../../superpowers/specs/2026-10-26-f1-spinner-stable-arc-design.md)

## 동작 사양

- 공통 컴포넌트는 standard MUI `CircularProgress`를 `variant="indeterminate"`로 렌더링한다.
- Custom `styled` wrapper 또는 `.MuiCircularProgress-circle`에 대한 app-authored `animation`, `strokeDasharray`, `stroke`, `strokeLinecap` override를 두지 않는다.
- MUI의 circle dash-length/offset keyframe과 progressbar root rotation은 모두 기본 동작을 유지한다. 원호의 길이가 변하는 것은 의도된 indeterminate animation이다.
- 모든 화면은 단일 `AppLoadingSpinner` 구현을 사용한다. 별도 spinner 구현은 추가하지 않는다.
- 기존 호출부의 크기, 두께, 색상, 접근성 속성, 위치 및 로딩 수명주기를 변경하지 않는다.

## 보존할 시각 계약

| 사용처 | 크기 | 두께 |
|---|---:|---:|
| 공통 기본값 | 34px | 2.4px |
| Dashboard 첫 접속 로더 | 34px | 3.6px |
| F1Grid/F1Tree 오버레이 | 34px | 2.4px |
| 기타 contextual spinner | 기존 호출부의 크기 | 기존 기본값 또는 명시값 |

테마 색상 및 기존 aria label을 그대로 전달한다. Grid/Tree overlay의 배경, 중앙 정렬, 입력 차단, `aria-busy` 및 로딩 완료 조건은 변경하지 않는다. Skeleton 기반 대기 UI도 변경하지 않는다.

## 회귀 검증 기준

- 기본 MUI circle의 dash keyframe 애니메이션과 root rotation 규칙이 존재한다.
- AppLoadingSpinner에 의해 `animation: none`이나 고정된 dasharray가 추가되지 않는다.
- 공통 기본값 34px·2.4px와 명시적 3.6px, contextual size/color/aria props 전달을 확인한다.
- F1Grid/F1Tree의 progressbar는 기존 34px·2.4px와 오버레이 동작을 유지한다.
- 브라우저에서 시간 간격에 따른 dash 길이 변화가 MUI indeterminate 동작이며, partial arc를 고정하는 별도의 CSS override가 없는지 확인한다.
- 공통/그리드/트리 집중 테스트, F1-Grid 문서 테스트, production build, `git diff --check`를 수행한다.
