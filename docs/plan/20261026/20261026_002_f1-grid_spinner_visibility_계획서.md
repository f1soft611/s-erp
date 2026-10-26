# 애플리케이션 공통 로딩 스피너 계획서

## 관련 문서

- 작업지시서: [20261026_002_f1-grid_spinner_visibility_작업지시서.md](../../directions/20261026/20261026_002_f1-grid_spinner_visibility_작업지시서.md)
- 설계: [F1-Grid 로딩 스피너 시각 정합성 설계](../../superpowers/specs/2026-10-26-f1-grid-loading-spinner-design.md)

## 목적

`frontend/src`의 indeterminate loading indicator를 `AppLoadingSpinner`로 통합하되, 각 사용처의 크기·색상·접근성 라벨·배치와 로딩 수명주기는 보존한다. 공통 기본값은 34px·3.6px, F1Grid/F1Tree 오버레이 두께는 가시성 요구에 따라 2.4px로 한다.

## 변경 파일과 책임

- `frontend/src/shared/components/AppLoadingSpinner.tsx`: MUI `CircularProgress` typed props forwarding 및 공통 기본값을 제공한다.
- MUI `CircularProgress`를 직접 호출하는 페이지/공용 컴포넌트: 모두 공통 래퍼를 사용하고 기존 MUI props를 보존한다. 대상은 작업지시서 및 상세사양서의 파일 목록과 계획 실행표를 따른다.
- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`: 기존 입력 차단 오버레이를 유지하고 2.4px Grid/Tree 스피너를 사용한다.
- `frontend/tests/app-loading-spinner.test.tsx`: 34px·3.6px 기본값과 크기/두께/색상/접근성 prop forwarding을 검증한다.
- 관련 소비처 회귀 테스트: 저장/상세/파일/문서 로딩 표시가 기존 역할을 보존하는지 확인한다.
- `frontend/tests/f1-grid.test.tsx`, `frontend/tests/f1-tree.test.tsx`: 공통 오버레이, 34px·2.4px, 배경색, 접근성 및 로딩 완료 동작을 검증한다.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`: Grid/Tree 로딩 계약을 설명한다.
- `frontend/src/pages/f1-grid-docs/data/f1GridApiReference.ts`, `f1GridDocs.ts`: 문서 포털의 loading prop 설명을 맞춘다.
- `docs/result/20261026/f1-grid-loading-spinner/`: 검증 결과와 브라우저 캡처를 기록한다.
- 작업 시작은 작업지시서→본 계획서→상세사양서 순서로 문서를 정리한 후 구현한다.

## 실행 순서

1. 작업지시서, 본 계획서, 상세사양서를 전체 호출처/2.4px 변경 범위에 맞춰 우선 정리한다.
2. 공통 컴포넌트 forwarding 테스트를 먼저 추가하고 기대대로 실패하는지 확인한다.
3. `AppLoadingSpinner`가 기존 MUI props를 받고 기본 34px·3.6px를 유지하도록 구현한다.
4. 각 직접 `CircularProgress` 사용처를 공통 컴포넌트로 전환하면서 기존 size/color/label를 보존한다.
5. Grid/Tree 기대 stroke를 2.4px로 수정해 실패를 확인한 후 구현하고 배경/접근성/입력 차단 계약을 유지한다.
6. 회귀 테스트, 직접 MUI 사용처 검색, 빌드를 수행한다.
7. 실제 브라우저에서 세 viewport 크기로 활성 로딩 상태를 검증하고 스크린샷 및 결과를 기록한다.

## 검증

- 명령: `cd frontend; npm run test -- tests/app-loading-spinner.test.tsx`
- 명령: `cd frontend; npx vitest run tests/common-code-item-help-dialog.test.tsx tests/customer-management-page.test.tsx tests/document-write-page.test.tsx tests/draft-form-management.test.tsx tests/feed-components.test.tsx tests/file-view.test.tsx tests/material-management.test.tsx tests/notice-page.test.tsx`
- 명령: `cd frontend; npx vitest run tests/f1-grid.test.tsx -t "loading overlay"`
- 명령: `cd frontend; npx vitest run tests/f1-tree.test.tsx -t "same loading spinner as F1Grid"`
- 명령: `cd frontend; npm run build`
- 검색: `rg -n "CircularProgress" frontend/src` 결과가 `AppLoadingSpinner.tsx`만 포함
- 브라우저: S-ERP F1-Grid 문서의 대용량 예제에서 10,000건 로딩 상태 확인, 375px·768px·1280px 캡처, 그리드 범위/중앙 정렬/가로 넘침/완료 동작 확인

## 완료 조건

- 앱 소스의 indeterminate spinner들이 공통 컴포넌트를 사용하며 기존 contextual size/color/label을 보존한다.
- 공통 기본 34px·3.6px, Grid/Tree 34px·2.4px를 사용한다.
- 오버레이, F1Tree 전달, loading lifecycle 및 상호작용 계약은 바뀌지 않는다.
- 회귀 테스트·빌드·브라우저 검증과 날짜별 결과 문서가 존재한다.
