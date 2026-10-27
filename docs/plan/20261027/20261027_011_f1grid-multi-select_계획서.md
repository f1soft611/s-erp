# F1-Grid Multi Select Implementation Plan

> **For agentic workers:** Execute inline with test-first changes and preserve parallel work.

**Goal:** `multiSelect?: boolean` 기본값 false로 행 선택 개수를 제한한다.

**Architecture:** 기존 rowSelection과 선택 API를 유지하며 사용자 입력에서 다중 동작을 gate한다. 초기/ref/실행 중 옵션 전환에도 동일한 단일 행 invariant를 적용한다. 표시 모드 selectionMode 및 셀 범위 선택과 독립적이다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Chromium.

## 1. 회귀

Files: `frontend\tests\f1-grid-row-selection.test.tsx`.

- [x] 기본값에서 Ctrl/Command/Shift 클릭과 Shift 방향키가 한 행만 선택하는 테스트를 추가한다.
- [x] checkbox 교체/해제, 전체 선택 숨김, 초기/ref 다중 ID 축약, 실행 중 false 전환의 테스트를 추가한다.
- [x] 기존 다중 선택 테스트에만 `multiSelect`를 명시한다.
- [x] `vitest run tests\f1-grid-row-selection.test.tsx --maxWorkers=1`에서 red를 확인한다.

## 2. 공통 구현

Files: `frontend\src\shared\components\f1-grid\types\grid.types.ts`, `core\F1Grid.tsx`, `core\GridHeader.tsx`.

- [x] `multiSelect?: boolean`과 기본값 false를 추가한다.
- [x] false에서는 Ctrl/Shift를 무시하고 마지막 대상 한 행만 선택한다. checkbox 선택 시 교체하고 선택 해제는 대상만 제거한다.
- [x] false에서는 헤더 Row Selector 전체 선택 컨트롤을 숨긴다. 데이터 컬럼 headerCheckbox는 유지한다.
- [x] 초기/ref는 현재 표시 순서에서 첫 유효 행만 반영한다. true→false는 첫 선택 행만 유지하며 콜백/ref/body가 같은 상태를 사용한다.

```tsx
<F1Grid rows={rows} columns={columns} rowKey="id"
  selectionMode="row" multiSelect />
```

## 3. 문서 및 검증

Files: `frontend\src\pages\f1-grid-docs\F1-GRID.md`, `data\f1GridApiReference.ts`, `data\f1GridDocs.ts`.

- [x] 기본값/옵션/전체 선택/초기·ref·전환 계약과 기존 행 선택 설명을 최신화한다.
- [x] 선택/병합/고정/렌더/문서 및 현황 관련 회귀를 실행한다. 기존 실패와 새 실패를 구분한다.
- [x] build와 변경 파일 oxlint를 실행한다.
- [x] 기존 4173 서버를 재사용해 375/768/1280px에서 기본 단일/명시 다중/checkbox/키보드를 확인한다.
- [x] `docs\result\20261027\f1grid-multi-select`에 결과/스크린샷을 저장한다.
