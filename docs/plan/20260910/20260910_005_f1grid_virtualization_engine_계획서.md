# F1-Grid 가상화 엔진 확장 계획서

## 작업 근거

- 작업지시서: [20260910*005_f1grid_virtualization_engine*작업지시서.md](../../directions/20260910/20260910_005_f1grid_virtualization_engine_작업지시서.md)

## 구현 전략

F1-Grid의 데이터/선택/편집 상태는 전체 데이터 기준으로 유지하고 Render Layer만 viewport window로 제한한다. 행과 컬럼 window 계산은 DOM과 분리된 순수 함수로 작성해 단위 테스트한다. 스크롤 이벤트는 ref에 최신 위치를 기록하고 `requestAnimationFrame` 콜백에서 한 번만 React state를 변경한다.

## 작업 단계

### 1. 가상화 계산 모델

- `GridVirtualization.ts`에 행/컬럼 window 타입과 계산 함수를 추가한다.
- 고정 행 높이 경로는 인덱스를 산술 계산해 100,000행에서도 스크롤마다 전체 행을 순회하지 않는다.
- 가변 행 높이 경로는 기존 사용자 지정 높이를 반영하되 대용량 임계값 이상에서는 사용하지 않는다.
- 컬럼 window는 누적 폭, viewport 너비, horizontal scroll, overscan으로 계산한다.

### 2. F1Grid viewport 상태

- 행/컬럼 자동 활성화와 prop 재정의를 연결한다.
- body scroll 측정을 단일 RAF 스케줄러로 통합한다.
- resize 시 viewport도 다시 계산한다.
- fixed row height 임계값 이상에서는 row resize 기능을 비활성화한다.

### 3. 렌더 계층 연결

- GridBody는 virtual row slice와 전체 row index offset을 받는다.
- GridRow는 렌더 대상 컬럼과 원래 전체 컬럼 index를 함께 사용한다.
- GridHeader도 같은 column window를 사용하되 pinned 컬럼은 항상 유지한다.
- 선택/편집/dirty/merge 계산은 전체 데이터 index를 기준으로 하고 렌더 셀에서만 CSS 상태를 계산한다.

### 4. 회귀 및 성능 검증

- row DOM 수, column DOM 수, pinned 유지, scroll window 이동, RAF coalescing, fixed row height를 테스트한다.
- 기존 F1-Grid 핵심 테스트와 문서 테스트를 실행한다.
- TypeScript/Vite 빌드를 실행한다.
- 브라우저에서 1,000행과 10,000행의 스크롤·셀 선택을 확인한다.

### 5. 문서화

- `F1-GRID.md`에 자동 활성화, 옵션, 제약, pinned/selection 계약을 기록한다.
- 결과 문서에 변경 파일, 테스트 결과, 브라우저 확인 결과를 남긴다.

## 변경 예상 파일

- `frontend/src/shared/components/f1-grid/core/GridVirtualization.ts` (신규)
- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- `frontend/src/shared/components/f1-grid/core/GridBody.tsx`
- `frontend/src/shared/components/f1-grid/core/GridRow.tsx`
- `frontend/src/shared/components/f1-grid/core/GridHeader.tsx`
- `frontend/src/shared/components/f1-grid/types/grid.types.ts`
- `frontend/tests/f1-grid.test.tsx`
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- `docs/result/20260910/f1grid-virtualization-engine/`

## 검증 명령

```powershell
Set-Location frontend
npx vitest run tests/f1-grid.test.tsx tests/f1-grid-pinned-column-range.test.tsx tests/f1-grid-form-modal.test.tsx tests/f1-grid-docs.test.tsx --maxWorkers=1 --testTimeout=30000
npm run build
```
