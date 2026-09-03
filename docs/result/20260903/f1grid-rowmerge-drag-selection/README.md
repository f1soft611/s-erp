# F1-Grid rowMerge 셀 드래그 범위 선택 비동작 수정 결과 보고서

## 1. 작업 개요

- **작업명**: F1-Grid `mergeRows` 셀 드래그 범위 선택 비동작 현상 수정
- **일자**: 2026-09-03
- **작업 대상**: `frontend/src/shared/components/f1-grid/core/GridCell.tsx`, `frontend/tests/f1-grid.test.tsx`, `docs/guide/F1-GRID.md`

## 2. 현황 및 원인 분석

- `mergeRows`가 설정된 컬럼에서 병합 시작 셀(`mergeInfo.isStart`)은 `gridRow: span N` 형태로 대형 영역을 차지함.
- 병합된 뒤쪽 셀(`mergedCellHidden === true`)에 `pointerEvents: 'none'`이 적용되어 있어 2번째 이하 병합 셀을 클릭/더블클릭하거나 마우스 드래그를 이동할 때 이벤트가 해당 행 셀에서 수신되지 않고, 1번째 병합 셀(`gridRow: span N`)로 이벤트가 투과됨.
- 이로 인해 2번째 병합 셀을 더블클릭해도 1번째 행으로 이벤트가 수신되어 1번째 행이 에디터 모드로 바뀌는 문제 및 드래그 범위 선택 비동작 현상이 발생함.

## 3. 수정 사항

1. **`GridCell.tsx` 마우스 포인터 상호작용 개편**:
   - `mergedCellHidden` 셀의 `pointerEvents: 'none'`을 `pointerEvents: 'auto'`로 변경.
   - `opacity: 0`을 유지하여 시각적 중복 텍스트 노출은 차단하면서 마우스 클릭, 더블클릭, 포인터 진입(`onMouseEnter`) 이벤트를 해당 행 셀에서 정상 수신하도록 함.
   - 2번째 병합 셀 더블클릭 시 2번째 행의 `rowId`로 `onStartEdit`가 정상 호출되어 2번째 행이 독립 에디터 모드로 전환됨.
2. **테스트 케이스 추가 및 업데이트 (`frontend/tests/f1-grid.test.tsx`)**:
   - `keeps a merged value editable for a non-leading row`: 2번째 병합 행 더블클릭 시 2번째 행 독립 에디트 모드 전환 검증
   - `supports cell-range drag selection across merged rows`: 일반 컬럼 `mergeRows` 영역 드래그 선택 검증
   - `supports cell-range drag selection on pinned merged columns`: Pinned 고정 컬럼 `mergeRows` 영역 드래그 선택 검증
3. **F1-Grid 가이드 문서 동기화 (`docs/guide/F1-GRID.md`)**:
   - Row Merge 항목에 드래그 범위 선택(Drag Cell Range Selection) 및 Pinned 고정 컬럼 연동 사양 반영.
4. **Vitest 캔버스 환경 보완 (`frontend/tests/setup.ts`)**:
   - jsdom이 구현하지 않는 `HTMLCanvasElement.getContext('2d')`를 텍스트 폭 측정용 목으로 대체.
   - F1-Grid 자동 열 너비 계산 시 `Not implemented: HTMLCanvasElement's getContext()` 오류가 출력되지 않도록 처리.

## 4. 검증 증거

- Vitest 단일 실행 명령:
  `Set-Location 'frontend'; npx vitest run tests/f1-grid.test.tsx -t "supports cell-range drag selection" --reporter=json --outputFile=vitest-drag-both.json`
- **결과**: `passed: 3, failed: 0` (100% Pass)
- 캔버스 환경 확인 명령:
  `Set-Location 'frontend'; npx vitest run tests/f1-grid.test.tsx -t "computes an auto-fit width"`
- **결과**: `HTMLCanvasElement.getContext()` 미구현 오류 없이 자동 열 너비 계산 경로 실행.
