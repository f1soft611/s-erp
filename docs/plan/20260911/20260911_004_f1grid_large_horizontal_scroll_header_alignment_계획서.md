# F1-Grid 대용량 가로 스크롤 헤더 정렬 오류 계획서

## 작업 근거

- 작업지시서: [../../directions/20260911/20260911*004_f1grid*대용량*가로스크롤*헤더정렬오류\_작업지시서.md](../../directions/20260911/20260911_004_f1grid_대용량_가로스크롤_헤더정렬오류_작업지시서.md)
- 범주: `bounded`
- 대상: `frontend/src/shared/components/f1-grid`

## 작업 목적

대용량 데이터셋에서 F1-Grid의 가로 스크롤을 끝까지 이동하면 헤더와 본문 데이터의 좌표가 어긋나며, 컬럼 정렬이 깨지는 현상을 수정한다. 핵심 원인은 스크롤 좌표, 가상 컬럼 인덱스, pinned/hidden column offset 계산이 서로 다른 기준을 사용할 때 발생하는 것으로 보고되고 있다.

## 현재 구조 분석

### 1. 헤더와 본문 스크롤 동기화

- `F1Grid`는 `headerScrollRef`와 `bodyScrollRef`를 각각 갖고 있다.
- `useEffect`에서 `bodyScroll` 이벤트가 발생하면 `headerScroll.scrollLeft`를 맞추고, 반대로 `headerScroll` 이벤트가 발생하면 `bodyScroll.scrollLeft`를 맞춘다.
- 이 동기화 로직은 일반적인 경우에는 동작하지만, 끝까지 스크롤 시 `columnTracks`, `renderedColumnIndexes`, `leftOffsets`, `rightOffsets` 계산과 같이 같은 스크롤 값이 다른 기준으로 재산출되면서 정렬이 어긋날 수 있다.

### 2. 컬럼 가상화 계산

- `getVirtualColumnIndexes`는 `scrollLeft`, `viewportWidth`, `pinnedIndexes`, `protectedIndexes`를 기반으로 보이는 컬럼 범위를 계산한다.
- `renderedColumnIndexes`는 이 값을 기준으로 결정되고, 헤더와 바디가 각기 다른 column track 기준을 사용하면 결국 좌표가 달라진다.
- 대용량 컬럼과 pinned/hidden state가 함께 있으면, 보이는 범위 계산이 실제 스크롤 위치보다 한 칸 못 미치거나 초과해 버리는 문제가 생긴다.

### 3. offset 계산과 레이아웃 불일치

- `GridHeader`는 `leftOffsets`, `rightOffsets`를 사용해 pinned 컬럼 위치를 조절한다.
- `GridBody`는 `getPinOffset`로 각 컬럼의 offset을 다시 계산한다.
- 스크롤 끝까지 가면 offset을 반영한 우측 경계와 실제 columnTracks width 계산이 서로 어긋나서 헤더/데이터 정렬이 틀어질 수 있다.

## 작업 분해

### Step 1: 재현 경계 확보

- 파일: `frontend/tests/f1-grid-virtualization.test.ts` 또는 관련 F1Grid 테스트 파일
- 작업:
  - 대용량 컬럼/스크롤 시나리오의 기준 재현 테스트를 작성한다.
  - 가로 스크롤 위치가 보이는 컬럼 범위 끝에서 헤더와 바디 간 정렬 차이가 발생하는 조건을 고정한다.
- 검증:
  - `cd frontend && npm run test -- tests/f1-grid-virtualization.test.ts`

### Step 2: 스크롤 동기화 기준 통일

- 파일:
  - `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
  - `frontend/src/shared/components/f1-grid/core/GridHeader.tsx`
  - `frontend/src/shared/components/f1-grid/core/GridBody.tsx`
- 작업:
  - header/body 스크롤 동기화 시점과 스크롤 값 계산 기준을 통일한다.
  - `scrollLeft`를 기준으로 보이는 범위와 offset 값을 한 번만 계산하도록 정리한다.
  - 다중 이벤트 update가 같은 좌표를 서로 다른 방식으로 반영하지 않게 한다.
- 검증:
  - `cd frontend && npm run test -- tests/f1-grid.test.tsx`

### Step 3: 가상 컬럼 계산 보정

- 파일: `frontend/src/shared/components/f1-grid/core/GridVirtualization.ts`
- 작업:
  - `getVirtualColumnIndexes`가 끝점 스크롤에서 경계값을 과소/과대 계산하지 않도록 보정한다.
  - pinned/protected 컬럼을 포함한 컬럼 인덱스 범위가 실제 렌더 순서와 일치하도록 한다.
- 검증:
  - `cd frontend && npm run test -- tests/f1-grid-virtualization.test.ts`

### Step 4: 추가 회귀 검증

- 파일: 전체 F1-Grid 관련 테스트 및 빌드
- 작업:
  - 기존 기능 회귀 여부를 확인한다.
  - pinned/hidden/column resize 동작과 대용량 가로 스크롤이 동시에 유지되는지 점검한다.
- 검증:
  - `cd frontend && npm run test`
  - `cd frontend && npm run build`

## 영향 범위

### 변경 대상

- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- `frontend/src/shared/components/f1-grid/core/GridHeader.tsx`
- `frontend/src/shared/components/f1-grid/core/GridBody.tsx`
- `frontend/src/shared/components/f1-grid/core/GridVirtualization.ts`
- 관련 테스트 파일

### 비영향 대상

- 백엔드 API/DB
- 다른 기능 화면
- 대규모 구조 재설계

## 검증 계획

### 최소 검증

- `cd frontend && npm run test -- tests/f1-grid-virtualization.test.ts`
- `cd frontend && npm run test -- tests/f1-grid.test.tsx`
- `cd frontend && npm run build`

### 추가 검증

- 브라우저에서 대용량 표를 열어 가로 스크롤 끝까지 이동해 헤더/바디 정렬을 확인한다.
- pinned column, hidden column, virtualized column 범위를 함께 확인한다.

## 결과 문서화

- 구현 완료 후 `docs/result/20260911/f1grid-large-horizontal-scroll-header-alignment/`에 원인, 조치, 검증 결과를 기록한다.
- 필요시 스크린샷을 함께 남긴다.

## DB 영향

- DB 스크립트: 해당 없음
- 영향 검토: 프론트엔드 공용 F1-Grid 레이아웃/스크롤 로직만 변경하며, 데이터베이스·API 계약은 유지한다.
