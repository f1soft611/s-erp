# F1-Grid Page Detail Search Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing F1-Grid page search metadata integration with `PageSearchArea` discoverable and actionable in the developer documentation portal.

**Architecture:** Add a `PageSearchArea` guide section to the existing filtering/sorting document, keeping the current menu and API reference model. Explain the actual flow from column `search` metadata through `toPageSearchFields` into `PageSearchArea`, while making clear that query construction and server/API calls remain page-owned.

**Tech Stack:** React/TypeScript documentation data, Vitest, Testing Library, Vite, Playwright browser validation.

---

## Files and responsibilities

- `docs/directions/20261014/20261014_005_f1_grid_detail_search_작업지시서.md` — approved goal, scope, and completion requirements.
- `docs/plan/20261014/20261014_005_f1_grid_detail_search_계획서.md` — dated project-level execution sequence.
- `docs/spec/20261014/20261014_005_f1_grid_detail_search_상세사양서.md` — verified contracts, exact documentation content, and acceptance checks.
- `docs/superpowers/specs/2026-10-14-f1-grid-page-detail-search-docs-design.md` — approved design.
- `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts` — filtering/sorting guide sections, API rows, and usage example.
- `frontend/src/pages/f1-grid-docs/data/f1GridApiReference.ts` — public API search metadata already documenting `F1GridColumn.search`; change only if linking/search discoverability requires it.
- `frontend/tests/f1-grid-docs.test.tsx` — portal content and discoverability regression.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md` — durable documentation contract and detailed-search responsibilities.
- `docs/result/20261014/f1-grid-docs-overhaul/20261014_005_f1_grid_detail_search_작업결과.md` — verified result and browser evidence.

## Task 1: Add a failing portal-content test

**Files:**
- Modify: `frontend/tests/f1-grid-docs.test.tsx`
- Read: `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`
- Read: `frontend/src/shared/components/PageSearchArea.tsx`
- Read: `frontend/src/shared/components/page-search/searchFields.ts`

- [x] **Step 1: Import `getF1GridDoc` if not already imported.** Keep the existing single import and use it for direct documentation assertions rather than mounting unrelated page components.
- [x] **Step 2: Add a test for the new section and exact integration flow.** Fetch `getF1GridDoc('filtering-sorting')`; find the prose section titled `PageSearchArea 상세검색 연동` and the code section titled `상세검색 폼 연결`. Assert that the prose documents every search metadata option, hidden behavior, supported types and fallback, `searchSpan`, date ranges, select options, controlled values, callbacks, and query ownership. Assert that the example includes date/select/hidden columns, `toPageSearchFields(columns)`, and the `PageSearchArea` props.
- [x] **Step 3: Assert the responsibility boundary.** In the same test, assert the section text explains that F1-Grid does not invoke the query/API and that the page creates conditions and sends the request.
- [x] **Step 4: Run the focused test to verify it fails before documentation is added.**

Run from `frontend/`:

```powershell
npm run test -- tests/f1-grid-docs.test.tsx
```

Expected: the new test fails because the filtering/sorting page currently has no detailed-search guide.

Use this test body (the file already imports `getF1GridDoc`):

```tsx
it('documents PageSearchArea detailed-search integration', () => {
  const doc = getF1GridDoc('filtering-sorting');
  const prose = doc.sections.find(
    (section) =>
      section.type === 'prose' &&
      section.heading === 'PageSearchArea 상세검색 연동',
  );
  expect(prose?.type).toBe('prose');
  if (!prose || prose.type !== 'prose') {
    throw new Error('Detailed-search integration prose is missing');
  }

  expect(prose.body).toContain('toPageSearchFields(columns)');
  expect(prose.body).toContain('PageSearchArea.detailFields');
  expect(prose.body).toContain('search.hidden');
  expect(prose.body).toContain('onDetailValuesChange');
  expect(prose.body).toContain('onDetailSearch');
  expect(prose.body).toContain('searchSpan');
  expect(prose.body).toContain('미지원');
  expect(prose.body).toContain('날짜 범위');
  expect(prose.body).toContain('options');
  expect(prose.body).toContain('Grid 자체가 서버 조회를 수행하지 않습니다');

  const example = doc.sections.find(
    (section) =>
      section.type === 'code' &&
      section.heading === '상세검색 폼 연결',
  );
  expect(example?.type).toBe('code');
  if (!example || example.type !== 'code') {
    throw new Error('Detailed-search example is missing');
  }
  expect(example.code).toContain('type: \'date\'');
  expect(example.code).toContain('toPageSearchFields(columns)');
  expect(example.code).toContain('detailFields={detailFields}');
});
```

## Task 2: Add the detailed-search integration guide

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`
- Test: `frontend/tests/f1-grid-docs.test.tsx`

- [x] **Step 1: Add a prose section to `filtering-sorting`.** Use the heading `PageSearchArea 상세검색 연동` and explain the chain `F1GridColumn.search` → `toPageSearchFields(columns)` → `PageSearchArea.detailFields`.
- [x] **Step 2: Describe the metadata options.** Explain `hidden`, `label`, `group`, `order`, and `span`; note that hidden columns and `search.hidden` fields are excluded, `label` falls back to `headerName`, type/options come from the column, and `search.span` is independent of `form.span`.
- [x] **Step 3: Add this accurate TypeScript/TSX example.** It includes a text field with label/group/order/span, a date field, a select field with `options`, a hidden field, memoized conversion, controlled detail values, and page-owned query callbacks:

```tsx
const columns = useMemo<F1GridColumn<Row>[]>(
  () => [
    {
      field: 'name',
      headerName: '이름',
      search: { label: '양식명', group: '기본', order: 1, span: 2 },
    },
    {
      field: 'createdAt',
      headerName: '등록일',
      type: 'date',
      search: { group: '기간', order: 2, span: 3 },
    },
    {
      field: 'status',
      headerName: '상태',
      type: 'select',
      options: statusOptions,
      search: { order: 3 },
    },
    {
      field: 'internalCode',
      headerName: '내부 코드',
      search: { hidden: true },
    },
  ],
  [statusOptions],
);

const detailFields = useMemo(
  () => toPageSearchFields(columns),
  [columns],
);

return (
  <PageSearchArea
    searchField={defaultSearchInput}
    detailFields={detailFields}
    detailValues={detailValues}
    onDetailValuesChange={setDetailValues}
    onDetailSearch={(values) => loadRows(toQuery(values))}
  />
);
```

`Row`, `statusOptions`, detail state, `toQuery`, `loadRows`, and `defaultSearchInput` are page-owned example values, not new F1-Grid APIs.
- [x] **Step 4: Explain data flow and query ownership.** State that date values are from/to, PageSearchArea provides form interactions/callbacks, and the business page combines default keywords, maps values to query parameters, loads rows, and handles API errors. Neither Grid nor `toPageSearchFields` makes a server request.
- [x] **Step 5: Preserve API-reference discoverability.** The prose body must include `toPageSearchFields` so portal document search finds the guide. Retain the existing `search` API row and augment its description with the literal `F1GridColumn.search`, so searching that identifier reveals a clickable API-reference result. The prose renderer has no inline API-anchor link support, so do not add a fake markdown link.
- [x] **Step 6: Run the focused portal test and verify the new test passes.**

Run from `frontend/`:

```powershell
npm run test -- tests/f1-grid-docs.test.tsx
```

Expected: the detailed-search documentation contract and existing API/search tests pass.

## Task 3: Synchronize the durable F1-Grid guide

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Read: `docs/spec/20261014/20261014_005_f1_grid_detail_search_상세사양서.md`

- [x] **Step 1: Cross-link the portal section from `PageSearchArea 상세 검색 연결`.** State that the interactive portal guide is under `필터와 정렬` → `PageSearchArea 상세검색 연동`.
- [x] **Step 2: Keep implementation contract language accurate.** Retain the existing statement that the helper only creates UI field definitions and pages own query conversion/API calls; update only wording needed for consistency.

## Task 4: Verify the portal and record evidence

**Files:**
- Create: `docs/result/20261014/f1-grid-docs-overhaul/20261014_005_f1_grid_detail_search_작업결과.md`

- [x] **Step 1: Run focused tests.**

Run from `frontend/`:

```powershell
npm run test -- tests/f1-grid-docs.test.tsx
```

Expected: all F1-Grid portal tests pass, including public API inventory, API search, filtering/sorting navigation, and detailed-search content.

- [x] **Step 2: Run the frontend production build.**

Run from `frontend/`:

```powershell
npm run build
```

Expected: TypeScript and Vite finish with exit code 0. Record non-fatal bundle-size warnings without changing build configuration.

- [x] **Step 3: Verify browser discoverability.** At `http://127.0.0.1:4173/f1-grid-docs`, search for `toPageSearchFields`; confirm the section heading and example render. Search for `F1GridColumn.search`; confirm the API reference result opens its API row. Check desktop and mobile layouts and save screenshots.
- [x] **Step 4: Write the result document.** Record actual test/build output, browser checks, and screenshot references. Do not claim implementation or server-side behavior beyond the documented contracts.

## Spec coverage self-review

- Metadata fields, order/defaults, hidden behavior, and type/options reuse: Tasks 1 and 2.
- Date/select fields and controlled detail callbacks: Task 2.
- Query conversion and API request ownership: Tasks 1 and 2.
- API discoverability and existing API inventory behavior: Task 2 and Task 4.
- Durable docs synchronization and verification evidence: Tasks 3 and 4.
