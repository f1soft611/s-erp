# F1-Grid Picker Dismiss Implementation Plan

**Goal:** 선택 없이 다른 셀이나 바깥 영역을 클릭하면 선택 에디터를 종료하고 원래 값을 보존한다.

**Architecture:** 기존 Grid의 외부 mousedown/blur 확정 흐름을 재사용한다. MUI Select의 portal 목록을 보호하는 동안 발생하는 미선택 목록 닫기는 에디터가 명시적으로 Grid의 `onStopEdit`에 전달한다. 항목 선택은 기존 저장/종료 경로를 유지하고 중복 종료를 막는다. 코드 버튼은 기존 패치 선택 계약을 유지하며 미선택 종료가 원래 타입의 값을 바꾸지 않도록 한다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Playwright.

## 근거와 파일

- [작업지시서](../../directions/20261027/20261027_004_f1grid-picker-dismiss_작업지시서.md)
- 기존 `F1Grid.tsx`는 에디터 밖 mousedown을 확정하지만 MUI popup 내부 클릭은 건너뛴다.
- `SelectEditor.tsx`는 현재 목록 닫기 콜백을 전달하지 않는다.
- `frontend/tests/f1-grid.test.tsx`: code/select 미선택 종료 및 정상 선택 회귀.
- `frontend/src/shared/components/f1-grid/editing/SelectEditor.tsx`, `CellEditor.tsx`: 목록 닫기를 기존 종료 콜백에 연결.
- 필요 시 `core/F1Grid.tsx`: code 미선택 확정의 원본 값 보존.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`: 사용자 동작 설명.

## 실행

- [x] code/select의 다른 셀 및 외부 클릭, select backdrop 닫기 테스트를 먼저 실행해 실제 실패 원인을 확인한다.
- [x] MUI Select에 미선택 `onClose`를 연결한다. `CellEditor` → `GridCell` → `GridRow`의 기존 `onStopEdit` 경로로 값 변경 없이 종료하며, 선택 시 기존 `onChange` 저장을 유지한다.
- [x] code 미선택 종료 때 원본 값 그대로 종료한다.
- [x] 해당 테스트 파일 전체, 관련 편집/성능 테스트, `npm run build`, 변경 파일 lint를 실행한다. 기존 실패와 새 회귀를 구분해 결과 문서에 기록한다.
- [x] 기존 4173 서버를 재사용해 합성 Grid를 실제 브라우저에서 검증하고 375/768/1280px 스크린샷을 저장한다.
- [x] 결과 문서에 재현, 원인, 해결, 회귀 결과 및 DB 변경 없음을 기록한다.

자동 커밋이나 업무 데이터 저장은 수행하지 않는다.
