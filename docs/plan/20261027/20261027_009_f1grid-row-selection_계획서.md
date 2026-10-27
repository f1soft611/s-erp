# F1-Grid Row Selection Implementation Plan

> **For agentic workers:** Use executing-plans to execute inline, preserving concurrent work. Track completion with checkboxes.

**Goal:** 기본 셀 선택을 유지하면서 현황 화면이 공통 `selectionMode="row"` 옵션으로 행 선택 표시를 사용한다.

**Architecture:** 기존 Set 기반 rowSelection을 선택 데이터의 단일 근거로 재사용한다. 행 모드에서는 셀 범위 드래그/테두리를 사용하지 않고 GridRow의 물리적 행 overlay로 병합/고정 열까지 강조한다. 내부 focusedCell은 키보드/편집을 위해 유지한다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Playwright.

## 1. 회귀 테스트

Files: `frontend\tests\f1-grid-row-selection.test.tsx`, `frontend\tests\sales-order-status-page.test.tsx`, `frontend\tests\document-status-page.test.tsx`.

- [x] 기본 셀 모드에는 셀 포커스 테두리/범위 복사가 유지됨을 확인한다.
- [x] 행 모드의 클릭/이동/복사/checkbox/ref 선택 및 해제, Ctrl/Shift 선택, 우클릭 선택 금지, 병합/고정 행의 독립 강조를 확인한다.
- [x] 옵션 전환으로 memo된 행에도 표시 모드가 반영되는지 확인한다.
- [x] `vitest run tests\f1-grid-row-selection.test.tsx --maxWorkers=1`에서 미구현 동작의 실패를 확인한다.

## 2. 공통 옵션

Files:
- `frontend\src\shared\components\f1-grid\types\grid.types.ts`
- `frontend\src\shared\components\f1-grid\core\{F1Grid,GridBody,GridRow,GridCell}.tsx`

- [x] `F1GridProps`에 `selectionMode?: 'cell' | 'row'`, 기본값 `'cell'`을 추가한다.
- [x] 모드를 Body/Row/Cell로 전달하고 memo 비교에 포함한다.
- [x] 행 모드는 셀 범위 생성을 막고 활성 셀 테두리 대신 선택 행 overlay를 표시한다. 편집 중 editor 표시는 유지한다.
- [x] 실제 클릭 modifier를 기존 `selectRow`에 전달하고 Shift의 행 anchor를 유지한다.
- [x] 키보드로 행이 이동하면 실제 행 선택도 이동한다. `Ctrl+C`는 보이는 선택 행의 모든 표시 컬럼을 복사한다.
- [x] 셀 모드의 기존 선택/편집/병합/우클릭 계약은 변경하지 않는다.

```tsx
<F1Grid selectionMode="row" rows={rows} columns={columns} rowKey="id" />
```

## 3. 현황 적용 및 문서

Files:
- `frontend\src\pages\sales\order\status\components\SalesOrderStatusGrid.tsx`
- `frontend\src\pages\groupware\documents\status\components\DocumentStatusGrid.tsx`
- `frontend\src\pages\f1-grid-docs\F1-GRID.md`
- `frontend\src\pages\f1-grid-docs\data\{f1GridApiReference,f1GridDocs}.ts`

- [x] 두 현황 Grid에 `selectionMode="row"`를 추가한다. 기존 dirty diff와 나머지 props를 보존한다.
- [x] 공통 문서/API에 사용 예제·기본값·마우스/키보드·복사·병합 행 동작을 기록한다.

병행 작업의 `salesOrderStatusColumns.ts`(이후 `.tsx`로 이동) 행번호 컬럼은 존재하지 않는 `orderId` 때문에 타입 검사가 실패했다. 기존 행 키인 `salesOrderDetailId`로 참조만 맞추고 나머지 컬럼/병합/너비 변경은 보존했다. 병행 상세패널 작업에서 추가된 콜백과 테스트는 변경하지 않는다.

## 4. 검증 및 결과

- [x] 새 테스트와 기존 선택/병합/고정/렌더 성능/현황/문서 테스트를 최소 관련 범위로 실행한다.
- [x] `npm run build`, 변경 TS/TSX `oxlint --quiet`를 실행한다.
- [x] 기존 4173 서버를 재사용해 Chromium 375/768/1280px에서 행 선택/가로 스크롤/병합/키보드와 기존 셀 모드를 확인한다.
- [x] `docs\result\20261027\f1grid-row-selection`에 결과 및 스크린샷을 저장한다. 작업 지시와 사양의 각 요구사항을 최종 대조한다.

별도 worktree/커밋/푸시는 만들지 않고 현재 작업의 최소 파일만 수정한다.

결과: [행 선택 옵션 결과](../../result/20261027/f1grid-row-selection/20261027_009_f1grid-row-selection_결과.md).
