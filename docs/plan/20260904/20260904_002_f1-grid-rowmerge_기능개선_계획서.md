# 계획서

## 1. 목적

F1-Grid의 `mergeRows` 계산 로직이 인접한 동일 값만 기준으로 병합하고 있어, 상위 컬럼의 merge 구역을 고려하지 않는 문제가 있다. 본 작업은 이전 컬럼의 merge 범위를 기준으로 하위 컬럼 merge를 제한하고, 같은 값이라도 서로 다른 상위 그룹은 병합하지 않는 규칙을 구현한다.

## 2. 작업 범위

### 프론트엔드

- `frontend/src/shared/components/f1-grid/merge/GridRowMerge.ts`
- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- 필요 시 `GridBody.tsx`/`GridRow.tsx`에서 merge 정보의 경계 처리 검토
- `frontend/tests/f1-grid.test.tsx`에 회귀 테스트 추가
- `frontend/src/pages/settings/system/f1-grid-test/F1GridTestPage.tsx` 또는 데모 화면 확인

### 백엔드

- 해당 없음

## 3. 구현 방식

1. `getGridMergeInfo`의 계산 로직을 단순 contiguous same-value 비교에서 상위 merge group 경계를 반영하는 방식으로 변경한다.
2. 이전 컬럼의 merge range를 기준으로 현재 컬럼이 같은 그룹 안에서만 병합되도록 계산한다.
3. 상위 merge 구간을 벗어나는 하위 merge는 시작되지 않도록 종료 조건을 추가한다.
4. 회귀 테스트를 추가해 동일 값이지만 다른 상위 그룹에서는 병합이 안 되는 케이스를 검증한다.

## 4. 검증 계획

- `cd frontend`
- `npx vitest run tests/f1-grid.test.tsx -t "row merge"`
- 필요 시 `npm run build`

## 5. 영향 범위

- 공통 F1-Grid merge 로직
- F1-Grid 병합 동작이 있는 화면 전체
- 문서/테스트 범위에 한정

## 6. 완료 기준

- 하위 컬럼 병합은 상위 merge 범위 안에서만 동작한다.
- 동일 값이어도 이전 merge 그룹이 다르면 중복 병합되지 않는다.
- 기존 row merge 테스트와 회귀 테스트가 통과한다.
