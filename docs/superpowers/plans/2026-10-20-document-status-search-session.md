# Document Status Search Session Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist only the last applied document-status search snapshot for the current browser tab session and restore the search form and same list query when the user returns.

**Architecture:** Reuse the existing `usePageSessionState` hook with a versioned document-status key. Keep draft form input in component-local state and update the persisted snapshot only when a search is applied; derive API filters from the snapshot. Reset clears the keyword and other detail values, restores the recent-month submitted-date default, and persists that reset snapshot.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, existing `usePageSessionState`.

---

## File Structure

- Modify `frontend/src/pages/groupware/documents/status/DocumentStatusPage.tsx`
  - Define and validate the page-specific session snapshot, initialize draft and applied state from it, persist at search/reset boundaries.
- Modify `frontend/tests/document-status-page.test.tsx`
  - Prove restore, applied-only persistence, reset persistence, and unchanged first-visit behavior through rendered UI and actual API request parameters.
- Modify `frontend/src/pages/f1-grid-docs/F1-GRID.md`
  - Document tab-session search restoration behavior.
- Create `docs/result/20261020/document-status-search-session/result.md`
  - Record implementation, tests, and any verification limitations.
- Reuse `frontend/src/shared/hooks/usePageSessionState.ts`; do not change this shared hook.

### Task 1: Add failing page-session behavior tests

**Files:**
- Modify: `frontend/tests/document-status-page.test.tsx`

- [x] **Step 1: Add the saved-session restoration test**

Use a single test that seeds `window.sessionStorage`, mounts the real page and checks both restored controls and the actual API query:

```ts
it('restores the last applied quick and detailed search when returning to the page', async () => {
  window.sessionStorage.setItem(
    's-erp:page:document-status',
    JSON.stringify({
      version: 1,
      value: {
        keyword: 'budget',
        detailValues: {
          title: 'Quarterly',
          submittedAt: { from: '2026-10-01', to: '2026-10-20' },
        },
      },
    }),
  );
  renderDocumentStatusPage();

  expect(await screen.findByText('41')).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: '문서현황 빠른 검색' }))
    .toHaveValue('budget');
  fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
  expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue('Quarterly');

  const request = getListRequest();
  expect(request.get('keyword')).toBe('budget');
  expect(request.get('title')).toBe('Quarterly');
  expect(request.get('submittedAtFrom')).toBe('2026-10-01');
  expect(request.get('submittedAtTo')).toBe('2026-10-20');
});
```

- [x] **Step 2: Run the page test and confirm the restore assertion fails**

Run: `Set-Location frontend; npm run test -- tests/document-status-page.test.tsx`

Expected: existing tests pass and the new test fails because the saved snapshot is not read and its query values are absent.

- [x] **Step 3: Add the applied-only persistence test**

Apply the quick search with Enter, then change the input without submitting. After unmount/remount, verify that the earlier applied keyword and API query are restored rather than the later draft value.

```ts
it('keeps the last applied search when later inputs are not submitted', async () => {
  const firstRender = renderDocumentStatusPage();
  expect(await screen.findByText('41')).toBeInTheDocument();
  const searchInput = screen.getByRole('textbox', {
    name: '문서현황 빠른 검색',
  });
  fireEvent.change(searchInput, { target: { value: 'applied' } });
  fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });
  expect(getListRequest().get('keyword')).toBe('applied');
  fireEvent.change(searchInput, { target: { value: 'draft' } });
  firstRender.unmount();

  api.get.mockClear();
  renderDocumentStatusPage();
  expect(await screen.findByText('41')).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: '문서현황 빠른 검색' }))
    .toHaveValue('applied');
  expect(getListRequest().get('keyword')).toBe('applied');
});
```

Clear `window.sessionStorage` in `beforeEach` to isolate this test from the restoration and reset cases.

- [x] **Step 4: Run the page test and confirm applied-only persistence fails**

Run: `Set-Location frontend; npm run test -- tests/document-status-page.test.tsx`

Expected: the new assertion fails because the current implementation does not establish the page-scoped persisted search snapshot contract.

- [x] **Step 5: Add the reset persistence test**

Mock an empty response so the existing empty-result action is available, seed an applied snapshot, and exercise reset plus remount:

```ts
it('restores the default submitted date after resetting conditions', async () => {
  window.sessionStorage.setItem(
    's-erp:page:document-status',
    JSON.stringify({
      version: 1,
      value: { keyword: 'old', detailValues: { title: 'Old title' } },
    }),
  );
  api.get.mockResolvedValue({ resultList: [], totalRowCount: 0 });
  const firstRender = renderDocumentStatusPage();
  expect(await screen.findByText(/조회 결과가 없습니다/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '검색 조건 초기화' }));

  const expectedRange = expectedRecentMonthRange(new Date());
  await waitFor(() => {
    expect(getListRequest().get('submittedAtFrom')).toBe(expectedRange.from);
    expect(getListRequest().get('submittedAtTo')).toBe(expectedRange.to);
  });
  expect(getListRequest().has('title')).toBe(false);
  expect(getListRequest().has('keyword')).toBe(false);
  await waitFor(() => {
    expect(JSON.parse(
      window.sessionStorage.getItem('s-erp:page:document-status') ?? '{}',
    )).toEqual({
      version: 1,
      value: {
        keyword: '',
        detailValues: { submittedAt: expectedRange },
      },
    });
  });
  firstRender.unmount();

  api.get.mockClear();
  renderDocumentStatusPage();
  expect(await screen.findByText(/조회 결과가 없습니다/)).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: '문서현황 빠른 검색' }))
    .toHaveValue('');
  expect(getListRequest().get('submittedAtFrom')).toBe(expectedRange.from);
  expect(getListRequest().get('submittedAtTo')).toBe(expectedRange.to);
  expect(getListRequest().has('title')).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));
  expect(screen.getByLabelText('결재신청일 시작일'))
    .toHaveValue(expectedRange.from);
  expect(screen.getByLabelText('결재신청일 종료일'))
    .toHaveValue(expectedRange.to);
});
```

- [x] **Step 6: Run the page test and confirm reset persistence fails**

Run: `Set-Location frontend; npm run test -- tests/document-status-page.test.tsx`

Expected: the new reset-date assertion fails because reset currently removes the submitted-date range.

### Task 2: Implement versioned session state in the status page

**Files:**
- Modify: `frontend/src/pages/groupware/documents/status/DocumentStatusPage.tsx`

- [x] **Step 1: Define the snapshot type and validator**

Add a local type:

```ts
type DocumentStatusSearchSession = {
  keyword: string;
  detailValues: Record<string, PageSearchFieldValue>;
};
```

Add a type guard that requires a non-null object, string `keyword`, object `detailValues`, and values limited to `PageSearchFieldValue` primitives (`string`, `boolean`, `null`, finite `number`) or date-range objects whose optional `from`/`to` properties are strings. Reject malformed nested values rather than casting arbitrary JSON.

Use a small type guard for each nested value and then validate all entries:

```ts
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPageSearchFieldValue(value: unknown): value is PageSearchFieldValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!isRecord(value)) return false;
  const range = value;
  return (
    Object.keys(range).every((key) => key === 'from' || key === 'to') &&
    (range.from === undefined || typeof range.from === 'string') &&
    (range.to === undefined || typeof range.to === 'string')
  );
}

function isDocumentStatusSearchSession(
  value: unknown,
): value is DocumentStatusSearchSession {
  if (!isRecord(value)) return false;
  const session = value;
  if (
    typeof session.keyword !== 'string' ||
    !isRecord(session.detailValues)
  ) return false;
  return Object.values(session.detailValues).every(isPageSearchFieldValue);
}
```

Use an explicit record guard before reading `from`/`to` if required by TypeScript; do not weaken the type with `any`.

- [x] **Step 2: Initialize the hook with the existing first-visit default**

Import `usePageSessionState`. Build the existing default snapshot from the current one-month submitted-date range and initialize state in this order:

```ts
const initialSearchSession: DocumentStatusSearchSession = {
  keyword: '',
  detailValues: { submittedAt: defaultSubmittedAtRange },
};
const { state: searchSession, setState: setSearchSession } =
  usePageSessionState(
    's-erp:page:document-status',
    initialSearchSession,
    { version: 1, validate: isDocumentStatusSearchSession },
  );
const [keyword, setKeyword] = useState(searchSession.keyword);
const [detailValues, setDetailValues] = useState(searchSession.detailValues);
const [appliedFilters, setAppliedFilters] = useState(() =>
  toDocumentStatusFilters(searchSession.keyword, searchSession.detailValues),
);
```

The fallback preserves the first-visit recent-month query; a valid stored empty snapshot remains empty.

- [x] **Step 3: Persist only when applying a search**

In the common search handler, normalize the keyword, clone the detail-values record including nested date ranges, persist the snapshot, and calculate filters from that same snapshot:

```ts
const snapshot: DocumentStatusSearchSession = {
  keyword,
  detailValues: Object.entries(values).reduce<
    Record<string, PageSearchFieldValue>
  >((copy, [field, value]) => {
    copy[field] =
      value !== null && typeof value === 'object' ? { ...value } : value;
    return copy;
  }, {}),
};
setSearchSession(snapshot);
setAppliedFilters(
  toDocumentStatusFilters(snapshot.keyword, snapshot.detailValues),
);
```

Do not call `setSearchSession` from individual input `onChange` handlers.

- [x] **Step 4: Persist the reset snapshot with the default date**

Update `resetSearch` to clear the keyword and non-date filters and persist the recent-month submitted-date range:

```ts
const resetDetailValues = { submittedAt: getDefaultSubmittedAtRange() };
const resetSnapshot = {
  keyword: '',
  detailValues: resetDetailValues,
};
setKeyword('');
setDetailValues(resetDetailValues);
setSearchSession(resetSnapshot);
setAppliedFilters(
  toDocumentStatusFilters(resetSnapshot.keyword, resetSnapshot.detailValues),
);
```

- [x] **Step 5: Run the page test and confirm the new behaviors pass**

Run: `Set-Location frontend; npm run test -- tests/document-status-page.test.tsx`

Expected: saved query restoration, applied-only persistence, default-date reset and restoration, and initial recent-month behavior pass. The existing `updatedAt` metadata expectation remains the one unrelated failing test in this target file.

### Task 3: Document and run focused verification

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Create: `docs/result/20261020/document-status-search-session/result.md`

- [x] **Step 1: Update F1-Grid document-status behavior documentation**

Add a concise explanation that document-status stores only applied quick/detail conditions in versioned tab-session state, restores and re-queries them on return, and resets the submitted date to the same recent-month default used on first visit.

- [x] **Step 2: Run focused tests and build**

Run:

```powershell
Set-Location frontend
npm run test -- tests/document-status-page.test.tsx
npm run build
```

The target file reported 11 passing tests and the known `updatedAt` metadata mismatch. TypeScript/Vite build succeeded with the existing bundle-size warning.

- [x] **Step 3: Record verification and inspect the patch**

Write the result document with the root paths changed, session key/version, applied-only/reset behavior, test totals, build outcome, and browser-validation limitations. Then run `git --no-pager diff --check`; expected output is empty with exit code 0.

## Self-Review

- All approved design requirements have tasks: applied-only snapshot, restored controls, automatic re-query, reset to default submitted-date range, first-visit default, session validation/versioning, and exclusions.
- No backend, API, or database changes are included.
- The session key and snapshot field names are consistent across the dated work instruction, specification, and test plan.
- Each behavior follows test-first steps and names a concrete targeted command.
