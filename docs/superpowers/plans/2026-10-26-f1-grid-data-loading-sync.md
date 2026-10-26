# F1-Grid 조회 데이터 표시 시점 정합 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 조회 완료 후 F1-Grid의 새 행이 내부 모델에 반영되기 전에 빈 그리드가 그려지는 프레임을 제거한다.

**Architecture:** F1-Grid의 외부 `rows` prop 동기화 effect만 passive effect에서 layout effect로 옮긴다. 동기화 조건과 내부 데이터 처리, 페이지별 조회 및 로딩 계약은 바꾸지 않고, 회귀 테스트와 사용자 문서에서 페인트 전 동기화 계약을 확인한다.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Vite, Playwright browser tools

---

## 파일 구조와 책임

- Modify `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`: 외부 `rows`와 내부 편집 상태를 동기화하는 effect를 `useLayoutEffect`로 전환한다.
- Modify `frontend/tests/f1-grid.test.tsx`: 조회 완료 시 최신 행과 로딩 오버레이 상태, 빈 결과 처리의 회귀 검증을 추가한다.
- Modify `frontend/src/pages/f1-grid-docs/F1-GRID.md`: 외부 조회 행이 로딩 종료 프레임에 표시되는 동기화 계약을 설명한다.
- Create `docs/result/20261026/f1-grid-data-loading-sync/20261026_004_f1-grid_data_loading_sync_결과서.md`: 원인, 변경 및 검증 결과를 기록한다.
- Create `docs/result/20261026/f1-grid-data-loading-sync/screenshots/`: 가능한 경우 인증된 품목관리·거래처 브라우저 화면 캡처를 보관한다.

## Task 1: 페인트 전 행 반영 회귀 테스트 추가

**Files:**
- Modify: `frontend/tests/f1-grid.test.tsx`

- [x] **Step 1: 기존 F1-GRID loading overlay 테스트에 새 prop 회귀 사례를 추가한다**

기존 `frontend/tests/f1-grid.test.tsx` 상단 import에 `createRoot`와 `flushSync`를 추가한다. 로딩 overlay 테스트에 아래와 같은 조회 완료 행을 두고, `createRoot`로 처음에는 빈 `rows`와 `loading`을 렌더링한다.

```tsx
const fetchedRows = [{ id: 'fetched', code: 'FETCHED' }];
```

그 다음 `flushSync`로 `rows={fetchedRows}`와 `loading={false}`를 함께 전달한다. 두 번째 `flushSync`를 감싼 `act` callback 내부에서 passive effect가 처리되기 전에 아래 결과를 확인한다.

```tsx
expect(container.querySelector('[role="gridcell"]')?.textContent).toBe('FETCHED');
expect(container.querySelector('[data-testid="f1-grid-loading-overlay"]')).toBeNull();
```

이어 기존 행이 있는 상태에서 조회 결과가 빈 배열로 바뀌고 loading이 종료되는 경우에도, 같은 동기 시점에 이전 행이 제거되고 overlay가 사라지는지 확인한다. 테스트 종료 전 `root.unmount()`를 `flushSync`로 실행하고 container를 제거한다. 기존 loading 중 스피너 스타일, 접근성 및 편집 복구 검증은 그대로 보존한다.

- [x] **Step 2: 집중 테스트를 실행해 테스트 기반 동작을 확인한다**

Run from `frontend`:

```powershell
npx vitest run tests/f1-grid.test.tsx -t 'commits fetched rows before the loading-complete update returns'
```

구현 전 RED 실행은 당시 테스트 이름으로 실행했으며, `loading={false}` 반영 직후 `gridcell`이 없어 실패했다. 이는 passive effect 이후의 최종 DOM이 아니라 행 동기화 시점을 확인한다.

## Task 2: 공통 그리드 동기화 시점을 변경

**Files:**
- Modify: `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- Test: `frontend/tests/f1-grid.test.tsx`

- [x] **Step 1: 외부 `rows` prop 동기화 effect를 layout effect로 옮긴다**

`F1Grid.tsx`에서 `rowsHaveEquivalentValues` 비교, 저장 행 확정 반영, dirty 변경 분기, 데이터 소스 리베이스, 선택/포커스 초기화 및 dependency 배열을 포함한 기존 effect 전체를 유지하고 hook만 바꾼다.

```tsx
  useLayoutEffect(() => {
    if (rowsHaveEquivalentValues(lastRowsPropRef.current, rows)) return;
    lastRowsPropRef.current = rows;
    if (acceptedRowsRef.current && rowsHaveEquivalentValues(acceptedRowsRef.current, rows)) {
      acceptedRowsRef.current = undefined;
      return;
    }
    acceptedRowsRef.current = undefined;
    const changes = getGridChanges(data);
    if (
      changes.insertedRows.length === 0 &&
      changes.updatedRows.length === 0 &&
      changes.deletedRows.length === 0
    ) {
      setData(createGridData(rows, rowKey));
      setRowSelection(createGridRowSelection());
      setFocusedCell(undefined);
    } else if (dataSource) {
      setData((current) => rebaseGridData(current, rows, rowKey));
    }
  }, [data, dataSource, rowKey, rows]);
```

`useLayoutEffect`는 파일 최상단 React import에서 이미 사용 중이므로 새 import나 다른 hook은 추가하지 않는다. 그 외 F1-Grid effect를 변경하지 않는다.

- [x] **Step 2: F1-Grid 집중 테스트를 실행한다**

Run from `frontend`:

```powershell
npx vitest run tests/f1-grid.test.tsx -t 'commits fetched and empty rows before loading-complete updates return'
```

결과: 종료 코드 0, 집중 회귀 1개 통과. 전체 파일은 아래 Task 4에 기록한 기준선 실패가 남아 있어, 이 집중 실행으로 새 행과 빈 결과의 동기 시점을 검증했다.

## Task 3: 사용자 문서에 동기화 계약 반영

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`

- [x] **Step 1: loading/외부 데이터 반영 설명에 페인트 전 동기화를 추가한다**

기존 “추가 반영 기능 요약” 또는 외부 데이터 동기화를 설명하는 가까운 절에 다음 의미를 기존 문체로 추가한다.

```markdown
- 조회 결과 `rows` prop은 내부 그리드 편집 모델에 브라우저 페인트 전에 반영한다. 조회 로딩이 종료되는 화면 프레임에 빈 그리드가 먼저 노출되지 않으며, API 호출과 페이지별 loading 상태 계약은 그대로 유지한다.
```

`F1-GRID.md`의 인접 section을 먼저 확인해 중복 설명은 만들지 않는다.

- [x] **Step 2: 문서와 코드 diff를 확인한다**

Run from repository root:

```powershell
git diff --check
git --no-pager diff -- frontend/src/shared/components/f1-grid/core/F1Grid.tsx frontend/tests/f1-grid.test.tsx frontend/src/pages/f1-grid-docs/F1-GRID.md
```

Expected: whitespace 오류 없이 공통 행 동기화 effect, 회귀 검증 및 사용자 문서만 변경된다.

## Task 4: 넓은 회귀 검증 및 브라우저 결과 기록

**Files:**
- Create: `docs/result/20261026/f1-grid-data-loading-sync/20261026_004_f1-grid_data_loading_sync_결과서.md`
- Create: `docs/result/20261026/f1-grid-data-loading-sync/screenshots/` when screenshots can be produced safely

- [x] **Step 1: F1-Grid와 직접 연관된 렌더/상태 회귀 테스트를 실행한다**

Run from `frontend`:

```powershell
npx vitest run tests/f1-grid.test.tsx -t 'commits fetched and empty rows before loading-complete updates return'
npm run test -- tests/f1-grid-render-performance.test.tsx tests/f1-grid-row-merge-regression.test.tsx
npm run test -- tests/material-management.test.tsx tests/customer-management-page.test.tsx
```

결과: 집중 회귀 1개, 그리드 렌더/병합 22개, 품목·거래처 페이지 42개가 통과했다. 전체 `tests/f1-grid.test.tsx` 실행은 162개 중 46개 실패, 116개 통과였고, 구현 전 기준선의 실패 46개와 동일한 실패 수다. 따라서 전체 파일을 성공으로 간주하지 않고 관련 집중 테스트 결과를 기준으로 기록한다.

- [x] **Step 2: 프론트엔드 프로덕션 빌드를 실행한다**

Run from `frontend`:

```powershell
npm run build
```

결과: TypeScript 프로젝트 빌드 및 Vite production build 종료 코드 0. 기존 번들 크기 안내가 출력됐다.

- [x] **Step 3: 인증된 브라우저에서 최초 목록 조회 동작을 확인한다**

공유된 품목관리 화면의 로드 완료 상태와 375px, 768px, 1280px 뷰포트를 확인했다. 계측이 최초 loading 완료 프레임을 놓쳐 실제 화면에서 overlay 제거와 행 표시가 같은 프레임인지 직접 확인하지는 못했다. 업무 데이터를 포함한 스크린샷 대신 합성 F1-Grid 로딩 화면을 캡처했으며, 제한을 결과서에 기록했다.

- [x] **Step 4: 결과서에 검증 근거를 기록한다**

결과서에 요청 증상, 코드상 원인, 변경 사항, 실행한 테스트/빌드 명령과 결과, 브라우저에서 확인한 화면 및 제한을 기록했다. 합성 캡처는 결과 폴더에 보관하고 상대 경로로 링크했다. 확인하지 못한 최초 loading 프레임은 직접 확인한 것으로 표현하지 않았다.

## 완료 확인

- 승인 설계 및 작업지시서 완료 조건 1~5에 대해 각각 테스트·빌드·브라우저 근거 또는 제한이 기록되어 있다.
- 검색/재조회 흐름, 편집 변경 보존, 저장 응답 행 확정, 빈 목록 및 loading overlay 시각 계약이 기존 테스트에서 계속 검증된다.
- 작업 트리에 이번 범위 밖의 변경이 섞이지 않는다.
