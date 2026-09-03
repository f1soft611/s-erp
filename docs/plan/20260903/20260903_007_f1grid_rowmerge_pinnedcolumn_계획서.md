# F1-Grid rowMerge 핀 고정 컬럼 적용 이슈 계획서

## 1. 목적

F1-Grid에서 `mergeRows` 기능이 일반 컬럼에서는 정상 동작하지만, pinned left/right 고정 컬럼에서는 병합 범위와 렌더링이 어긋나는 문제를 정리하고 수정한다.

## 2. 현황 분석

- `mergeRows`는 `GridBody`와 `GridCell`에서 셀 병합 여부를 계산하고 렌더링한다.
- 고정 컬럼은 `GridRow`/`GridCell`의 `pinOffset`과 sticky positioning 구조를 사용한다.
- 현재 병합 계산은 단순 비교 기반이며, 고정 컬럼 내에서 셀의 `gridColumn`/`gridRow` 위치와 실제 시각적 위치가 맞지 않을 가능성이 있다.
- 기존 테스트는 병합이 일반 컬럼에서만 검증되고 있어 pinned 컬럼 케이스가 누락되어 있다.

## 3. 작업 범위

### 3.1 프론트엔드 수정 범위

- `frontend/src/shared/components/f1-grid/core/GridBody.tsx`
- `frontend/src/shared/components/f1-grid/core/GridRow.tsx`
- `frontend/src/shared/components/f1-grid/core/GridCell.tsx`
- `frontend/src/shared/components/f1-grid/merge/GridRowMerge.ts`
- 필요한 경우 관련 CSS/layout 로직

### 3.2 테스트 범위

- `frontend/tests/f1-grid.test.tsx`에 pinned 컬럼 row merge 시나리오 추가
- 병합 시작/연속 셀 레이아웃 검증

## 4. 구현 접근법

1. 병합 결정 로직이 pinned 컬럼에서도 동일한 시퀀스 기준으로 계산되는지 확인한다.
2. `GridCell`에서 `merged` 플래그와 `gridRow` span 처리와 sticky offset이 충돌하지 않는지 검증한다.
3. `GridBody`/`GridRow`에서 pinned 컬럼이 포함된 경우에도 `mergeInfo`와 `merged` 상태를 동일하게 전달하도록 정리한다.
4. 필요한 수정 후, 테스트를 추가하고 실제 렌더링 기준으로 검증한다.

## 5. 검증 계획

- `cd frontend`
- `npm run test -- tests/f1-grid.test.tsx`
- 필요 시 브라우저 렌더링 검증을 추가한다.

## 6. 영향 범위

- F1-Grid 일반 기능에 영향은 있으나 범위는 공통 row merge 렌더링 로직으로 제한한다.
- 다른 기능과의 충돌을 최소화하기 위해 `mergeRows` 전용 경로만 수정한다.
