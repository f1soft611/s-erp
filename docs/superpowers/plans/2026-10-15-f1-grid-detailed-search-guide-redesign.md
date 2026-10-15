# F1-Grid 상세검색 가이드 개편 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the F1-Grid detailed-search guide easy to follow from selecting columns through rendering fields and applying real page filters.

**Architecture:** Rework only the existing `filtering-sorting` portal document, using its prose, code, and API-table section types. Base the end-to-end example on the current draft-form management search contract, keep date-range support separate, and leave runtime behavior untouched.

**Tech Stack:** React, TypeScript, F1-Grid documentation data, Vitest, Vite, browser-based portal validation.

---

## File map

- `docs/directions/20261015/20261015_001_f1_grid_detail_search_guide_redesign_작업지시서.md` — scoped request and completion criteria.
- `docs/plan/20261015/20261015_001_f1_grid_detail_search_guide_redesign_계획서.md` — dated project-level sequence.
- `docs/spec/20261015/20261015_001_f1_grid_detail_search_guide_redesign_상세사양서.md` — accepted content contract and examples.
- `docs/superpowers/specs/2026-10-15-f1-grid-detailed-search-guide-redesign.md` — approved design.
- `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts` — ordered guide sections, table, and code examples.
- `frontend/tests/f1-grid-docs.test.tsx` — guide content and existing API-search regression.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md` — durable developer guide and portal pointer.
- `frontend/src/pages/f1-grid-docs/data/f1GridApiReference.ts` — preserve the existing searchable `F1GridColumn.search` row; do not remove its current search wording.
- `docs/result/20261015/f1-grid-detail-search-guide/20261015_001_f1_grid_detail_search_guide_redesign_작업결과.md` — verification evidence and screenshot links.
- `docs/result/20261015/f1-grid-detail-search-guide/screenshots/` — final desktop and mobile screenshots.

## Task 1: Create the dated request and execution documents

**Files:**
- Create: `docs/directions/20261015/20261015_001_f1_grid_detail_search_guide_redesign_작업지시서.md`
- Create: `docs/plan/20261015/20261015_001_f1_grid_detail_search_guide_redesign_계획서.md`
- Create: `docs/spec/20261015/20261015_001_f1_grid_detail_search_guide_redesign_상세사양서.md`
- Read: `docs/superpowers/specs/2026-10-15-f1-grid-detailed-search-guide-redesign.md`

- [ ] **Step 1: Write the work direction.** Record the specific problem, approved step-by-step approach A, in-scope guide/test/docs files, and out-of-scope runtime/backend/database changes.
- [ ] **Step 2: Write the dated project plan.** List the order: dated docs, failing tests, portal content, durable guide, focused test/build/browser verification, result screenshots/document.
- [ ] **Step 3: Write the detailed content specification.** Specify exact section order, actual draft-form filters (`categoryItemId`, `regTermId`, `useAt`), base keyword flow, date example boundary, callbacks, field metadata, and acceptance criteria. Confirm no invented date API parameters or unsupported filters are present.
- [ ] **Step 4: Review all three documents against the approved design.** Run `git diff --check -- docs/directions/20261015 docs/plan/20261015 docs/spec/20261015` and inspect the documents for scope contradictions and unresolved placeholders.

## Task 2: Add portal tests first

**Files:**
- Modify: `frontend/tests/f1-grid-docs.test.tsx`
- Read: `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`

- [ ] **Step 1: Add one test that asserts the ordered guide sections.** Require these headings in this order in `getF1GridDoc('filtering-sorting').sections`: `상세검색은 이렇게 연결됩니다`, `1단계: 검색할 컬럼 고르기`, `2단계: 검색 필드 만들기`, `3단계: 검색 영역에 연결하기`, `4단계: 조회 조건으로 바꾸기`, `전체 예제: 기안양식 검색`, `날짜 범위 조건이 필요한 경우`, and `빠른 참조: 설정과 주의점`. Use this assertion:

```tsx
const doc = getF1GridDoc('filtering-sorting');
const guideHeadings = doc.sections
  .filter((section) =>
    section.heading.includes('상세검색') ||
    section.heading.includes('검색할 컬럼 고르기') ||
    section.heading.includes('검색 필드 만들기') ||
    section.heading.includes('검색 영역에 연결하기') ||
    section.heading.includes('조회 조건으로 바꾸기') ||
    section.heading.includes('기안양식 검색') ||
    section.heading.includes('날짜 범위 조건') ||
    section.heading.includes('빠른 참조'),
  )
  .map((section) => section.heading);
expect(guideHeadings).toEqual([
  '상세검색은 이렇게 연결됩니다',
  '1단계: 검색할 컬럼 고르기',
  '2단계: 검색 필드 만들기',
  '3단계: 검색 영역에 연결하기',
  '4단계: 조회 조건으로 바꾸기',
  '전체 예제: 기안양식 검색',
  '날짜 범위 조건이 필요한 경우',
  '빠른 참조: 설정과 주의점',
]);
```

- [ ] **Step 2: Assert the real draft-form contract and readable explanations.** Verify the guide prose names the four stages; distinguishes Grid header filtering from page detail search; identifies `categoryItemId`, `regTermId`, `useAt` as the actual detail keys; explains `detailFields`, `detailValues`, `onDetailValuesChange`, and `onDetailSearch`; and says that the page converts values and owns requests/errors.
- [ ] **Step 3: Assert every example section.** Verify the column example has category/reg-term/useAt select values and options; hidden code/name fields remain excluded; the end-to-end section combines `searchQuery` with numeric category/reg-term and validated Y/N; the date section shows `{ from, to }` and explicitly says draft-form management does not currently search by creation date.
- [ ] **Step 4: Assert quick-reference metadata and preserve API discovery.** Verify the guide covers `hidden`, `label`, `group`, `order`, `span`, `column.hidden`, `search.hidden`, supported types, text fallback, `searchSpan`, and `form.span`. Keep the existing `F1GridColumn.search` API search test selecting its API row.
- [ ] **Step 5: Run the focused test and confirm RED.** From `frontend/`, run `npm run test -- tests/f1-grid-docs.test.tsx`. Expect failure because the ordered guide sections do not yet exist; existing unrelated tests should otherwise execute normally.

## Task 3: Rebuild the portal guide as a step-by-step recipe

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`
- Test: `frontend/tests/f1-grid-docs.test.tsx`
- Read: `frontend/src/pages/co/workflow/form/components/DraftFormGrid.tsx`
- Read: `frontend/src/pages/co/workflow/form/DraftFormManagementPage.tsx`
- Read: `frontend/src/pages/co/workflow/form/hooks/useDraftFormManagement.ts`
- Read: `frontend/src/pages/co/workflow/form/services/draftFormManagement.service.ts`
- Read: `frontend/src/shared/components/page-search/searchFields.ts`
- Read: `frontend/src/shared/components/PageSearchArea.tsx`

- [ ] **Step 1: Write the overview section as short prose.** Explain the two distinct concepts: Grid header filters act on Grid rows, while this guide connects column metadata to a page-owned collapsible search form. Show the flow in order: `columns.search → toPageSearchFields(columns) → PageSearchArea → page filters → list API`. Say that F1-Grid does not execute the page search API.
- [ ] **Step 2: Write the column-selection step from the real columns.** Show the relevant actual metadata shape, not fabricated field names:

```tsx
{
  field: 'categoryItemId',
  headerName: '분류',
  type: 'select',
  options: categoryItems.map((item) => ({
    value: Number(item.id),
    label: item.itemNm,
  })),
  search: { label: '분류', order: 1 },
},
{
  field: 'regTermId',
  headerName: '등록주기',
  type: 'select',
  options: cycleItems.map((item) => ({
    value: Number(item.id),
    label: item.itemNm,
  })),
  search: { label: '등록주기', order: 2 },
},
{
  field: 'useAt',
  headerName: '사용여부',
  type: 'select',
  options: [
    { value: 'Y', label: '사용' },
    { value: 'N', label: '미사용' },
  ],
  search: { label: '사용여부', order: 3 },
},
{
  field: 'codeName',
  headerName: '양식명',
  search: { hidden: true },
},
```

Explain that `search.hidden` excludes a field from detail search; `codeName` remains available through the page's separate basic keyword field.
- [ ] **Step 3: Add a compact metadata-to-field API table.** Use the current `api` section renderer with rows describing `hidden`, `label`, `group`, `order`, `span`, `type/options`, and the corresponding generated field property. State that `column.hidden` and `search.hidden` both exclude a field; a label falls back to `headerName`; `search.span` produces `searchSpan` (default 1, range 1–5); `form.span` is unrelated.
- [ ] **Step 4: Show the conversion step and what it returns.** Add the exact helper usage:

```tsx
const detailFields = useMemo(
  () => toPageSearchFields(columns),
  [columns],
);
```

Explain that `detailFields` is UI configuration. Summarize the resulting keys (`field`, `label`, `type`, `searchSpan`, optional `group` and `options`) in prose or the metadata table; do not imply it contains query parameters or causes an API request.
- [ ] **Step 5: Explain the `PageSearchArea` controlled-value loop.** Show the page state and the actual relevant props:

```tsx
const [searchQuery, setSearchQuery] = useState('');
const [detailValues, setDetailValues] = useState<
  Record<string, PageSearchFieldValue>
>({});

<PageSearchArea
  searchField={defaultSearchInput}
  onDefaultSearch={handleDefaultSearch}
  detailFields={detailFields}
  detailValues={detailValues}
  onDetailValuesChange={setDetailValues}
  onDetailSearch={handleDetailSearch}
  detailLoading={management.loading}
/>;
```

Explain: the input edit calls `onDetailValuesChange`; the page stores the new values; invoking detailed search calls `onDetailSearch(values)`; the base keyword uses its separate callback and state. All names used by the sample must be declared in the immediately following complete example or identified as values defined in its surrounding page.
- [ ] **Step 6: Show the conversion from detail values to the real page filter.** Match current handling:

```tsx
const selected = (value: PageSearchFieldValue | undefined) =>
  value == null || typeof value === 'object' ? '' : String(value).trim();
const useAt = selected(values.useAt);

requestSearch({
  keyword: searchQuery.trim() || undefined,
  categoryItemId: selected(values.categoryItemId)
    ? Number(selected(values.categoryItemId))
    : undefined,
  regTermId: selected(values.regTermId)
    ? Number(selected(values.regTermId))
    : undefined,
  useAt: useAt === 'Y' || useAt === 'N' ? useAt : undefined,
});
```

Explain why select IDs are converted to numbers, why invalid usage values are omitted, and that `requestSearch` applies filters through the existing page management flow. Mention that the page checks for unsaved Grid edits before applying search, and that the hook/service performs loading, API error reporting, and requests. Do not copy an unverified endpoint into the guide.
- [ ] **Step 7: Add one complete, internally consistent end-to-end TSX example.** Present the following as a connected code example, with the immediately preceding column snippet repeated or referenced through an explicit note that `columns` is created by `createDraftFormColumns` from `categoryItems`, `cycleItems`, and the existing page options:

```tsx
const [searchQuery, setSearchQuery] = useState('');
const [detailValues, setDetailValues] = useState<
  Record<string, PageSearchFieldValue>
>({});
const [pendingFilters, setPendingFilters] =
  useState<DraftFormFilters | null>(null);
const [refreshConfirmOpen, setRefreshConfirmOpen] = useState(false);

const detailFields = useMemo(() => toPageSearchFields(columns), [columns]);

const requestSearch = (filters: DraftFormFilters) => {
  if (management.hasChanges) {
    setPendingFilters(filters);
    setRefreshConfirmOpen(true);
    return;
  }
  management.applyFilters(filters);
};

const selected = (value: PageSearchFieldValue | undefined) =>
  value == null || typeof value === 'object' ? '' : String(value).trim();

const handleDetailSearch = (
  values: Record<string, PageSearchFieldValue>,
) => {
  const useAt = selected(values.useAt);
  requestSearch({
    keyword: searchQuery.trim() || undefined,
    categoryItemId: selected(values.categoryItemId)
      ? Number(selected(values.categoryItemId))
      : undefined,
    regTermId: selected(values.regTermId)
      ? Number(selected(values.regTermId))
      : undefined,
    useAt: useAt === 'Y' || useAt === 'N' ? useAt : undefined,
  });
};

const handleDefaultSearch = () => {
  requestSearch({
    ...management.appliedFilters,
    keyword: searchQuery.trim() || undefined,
  });
};

const defaultSearchInput = (
  <TextField
    size="small"
    placeholder="양식코드/양식명 검색"
    value={searchQuery}
    onChange={(event) => setSearchQuery(event.target.value)}
  />
);

return (
  <>
    <PageSearchArea
      searchField={defaultSearchInput}
      onDefaultSearch={handleDefaultSearch}
      detailFields={detailFields}
      detailValues={detailValues}
      onDetailValuesChange={setDetailValues}
      onDetailSearch={handleDetailSearch}
      detailLoading={management.loading}
    />
    <PageMessageArea
      message={management.error}
      onClose={() => management.setError('')}
    />
    <UnsavedChangesConfirmDialog
      open={refreshConfirmOpen}
      title="저장하지 않은 변경사항"
      description="변경사항을 버리고 기안양식 목록을 다시 불러오시겠습니까?"
      cancelLabel="취소"
      continueLabel="계속"
      onCancel={() => {
        setRefreshConfirmOpen(false);
        setPendingFilters(null);
      }}
      onContinue={() => {
        const filters = pendingFilters;
        setRefreshConfirmOpen(false);
        setPendingFilters(null);
        if (!filters) return;
        management.discardChanges();
        management.applyFilters(filters);
      }}
    />
  </>
);
```

The accompanying note must identify only genuine surrounding page context: `columns` is memoized from `createDraftFormColumns(management.categoryItems, management.cycleItems, management.users, ...)`; `management` comes from `useDraftFormManagement()`; the real page uses `UnsavedChangesConfirmDialog` for the `pendingFilters` and `refreshConfirmOpen` state shown; confirming calls `management.discardChanges()` and then applies the pending filters. `PageMessageArea` displays hook-owned request errors. State explicitly that this is a connected example of the page's search wiring, not the complete CRUD page, and that the production page retains its permission, dirty-edit, and dialog behavior. Do not use invented endpoint names or imply that filtering is run by Grid.
- [ ] **Step 8: Put date-range support in a clearly separate example.** Use a small generic `createdAt` date column with `search.span`, show the resulting `detailValues.createdAt` shape `{ from: '2026-01-01', to: '2026-01-31' }`, and explicitly label it as an example for another page, not a current draft-form search field. Do not invent how a server should name its date query parameters.
- [ ] **Step 9: Add a quick-reference section after the examples.** Use concise bullets/prose or the existing API-table type to document supported detailed-search types (`text`, `number`, `decimal`, `currency`, `date`, `select`, `checkbox`), unsupported-type fallback to `text`, hidden-column rules, select `options`, search/order defaults, and the distinction from Grid header filter operators.
- [ ] **Step 10: Run the focused portal test and confirm GREEN.** From `frontend/`, run `npm run test -- tests/f1-grid-docs.test.tsx`; expect all tests, including exact API-row discovery, to pass.

## Task 4: Synchronize the durable guide and dated result record

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Create: `docs/result/20261015/f1-grid-detail-search-guide/20261015_001_f1_grid_detail_search_guide_redesign_작업결과.md`
- Create: `docs/result/20261015/f1-grid-detail-search-guide/screenshots/f1-grid-detail-search-guide-desktop.png`
- Create: `docs/result/20261015/f1-grid-detail-search-guide/screenshots/f1-grid-detail-search-guide-mobile.png`

- [ ] **Step 1: Update the durable guide.** Preserve its verified helper/query responsibility description, add the exact portal navigation location, and accurately state that draft-form management searches category, registration cycle, usage state, and a separate keyword, but not creation date.
- [ ] **Step 2: Run `git diff --check`.** Run `git diff --check -- frontend/src/pages/f1-grid-docs frontend/tests/f1-grid-docs.test.tsx docs/directions/20261015 docs/plan/20261015 docs/spec/20261015 docs/result/20261015`. Expected: exit code 0 and no whitespace diagnostics.

## Task 5: Validate the guide in tests, build, and browser

**Files:**
- Test: `frontend/tests/f1-grid-docs.test.tsx`
- Read: all changed F1-Grid guide content
- Create: two screenshots under `docs/result/20261015/f1-grid-detail-search-guide/screenshots/`

- [ ] **Step 1: Run the focused tests.** From `frontend/`, run `npm run test -- tests/f1-grid-docs.test.tsx`. Expected: one test file, zero failures; verify the guide contract and `F1GridColumn.search` result opens the `F1GridColumn` API row.
- [ ] **Step 2: Run the production build.** From `frontend/`, run `npm run build`. Expected: TypeScript and Vite exit 0. Record, but do not alter, any pre-existing bundle-size warnings.
- [ ] **Step 3: Verify portal search and rendered section order in browser.** On `http://127.0.0.1:4173/f1-grid-docs`, search `toPageSearchFields`, inspect all step headings, table, and code samples. Then search `F1GridColumn.search` and select the API result; confirm the `F1GridColumn.search` row is visible.
- [ ] **Step 4: Check responsive layout and save evidence.** At 1280px and 375px viewport widths, inspect headings, tables, and code. Verify page-level `scrollWidth` does not exceed `clientWidth` at 375px. Save screenshots with the exact paths listed in Task 4.
- [ ] **Step 5: Write the result document from actual outputs.** Record focused test counts, build outcome/warnings, browser/API-search results, responsive overflow measurement, changed files, and relative screenshot links. Do not claim that a date-range backend filter exists.

## Completion checklist

- [ ] Dated work direction, plan, and detailed spec were created and match the approved design.
- [ ] The new failing content test was observed before guide implementation.
- [ ] The step-by-step guide uses the real draft-form search values and has a coherent end-to-end example.
- [ ] Date range is clearly separate from the actual draft-form search contract.
- [ ] The API search affordance, test/build, desktop/mobile browser checks, and screenshots were verified.
- [ ] Durable guide and dated result document match actual behavior and evidence.
