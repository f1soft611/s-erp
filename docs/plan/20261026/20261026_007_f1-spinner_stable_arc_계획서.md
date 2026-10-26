# 공통 로딩 스피너 MUI 애니메이션 복구 계획서

## 관련 문서

- 작업지시서: [20261026_007_f1-spinner_stable_arc_작업지시서.md](../../directions/20261026/20261026_007_f1-spinner_stable_arc_작업지시서.md)
- 승인된 설계: [F1 Spinner Stable-Arc Design](../../superpowers/specs/2026-10-26-f1-spinner-stable-arc-design.md)
- 상세사양서: [20261026_007_f1-spinner_stable_arc_상세사양서.md](../../spec/20261026/20261026_007_f1-spinner_stable_arc_상세사양서.md)

## 구현 순서

1. `AppLoadingSpinner` 테스트에 기본 MUI circle dash keyframe과 indeterminate variant, custom animation override 부재를 검증하는 조건을 추가하고 현재 구현에서 실패하는지 확인한다.
2. `AppLoadingSpinner`에서 custom styled wrapper 및 circle dash/animation override를 제거하고 standard MUI `CircularProgress`를 명시적 indeterminate variant로 렌더링한다.
3. 공통 spinner, F1Grid/F1Tree 로딩 집중 테스트, F1-Grid 문서 테스트를 실행한다.
4. F1-Grid 가이드/API 문서에 MUI indeterminate 원호 애니메이션을 기술하고 로딩 흐름이나 크기·두께를 변경하지 않는다.
5. 브라우저에서 동일 스피너를 여러 애니메이션 시점 및 반복 로딩 시작에서 비교하고 결과와 캡처를 기록한다.
6. 프론트엔드 빌드와 `git diff --check`를 실행한다.

## 수정 파일

- `frontend/src/shared/components/AppLoadingSpinner.tsx`
- `frontend/tests/app-loading-spinner.test.tsx`
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- `frontend/src/pages/f1-grid-docs/data/f1GridApiReference.ts`
- `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`
- `docs/result/20261026/f1-spinner-stable-arc/`

## 완료 조건

- Circle 호가 고정되고 회전은 계속 동작한다.
- 기본 34px·2.4px, Dashboard 34px·3.6px, Grid/Tree 34px·2.4px 계약이 그대로다.
- 공통 컴포넌트의 크기·두께·색상·접근성 props가 보존된다.
- 집중 테스트, 문서 테스트, production build, 브라우저 검증 및 결과 기록이 완료된다.
