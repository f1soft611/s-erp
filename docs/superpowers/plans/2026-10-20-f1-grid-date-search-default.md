# F1-Grid Date Search Defaults Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow F1-Grid date-search columns to declare fixed or server-date-relative defaults and apply those defaults on initial entry and search reset.

**Architecture:** Add a typed default expression to date search metadata, resolve system-date expressions from one common backend API using calendar arithmetic, and reuse the resolved field values for initial search, UI initialization, and reset. The document-status submitted date will move from browser-clock calculation into this shared metadata path.

**Tech Stack:** React, TypeScript, MUI, Vitest, Spring MVC, eGovFrame `EgovDateUtil`, JUnit 5, existing `dayjs` and `apiGet`.

---

## File Structure

- Backend:
  - Create `backend/src/main/java/egovframework/com/common/controller/CommonSystemDateApiController.java` to expose the existing backend current-date utility in the standard `ResultVO` envelope.
  - Create `backend/src/test/java/egovframework/com/common/controller/CommonSystemDateApiControllerTest.java` to verify the endpoint returns an ISO date under `result.today`.
  - Reuse `backend/src/main/java/egovframework/let/utl/fcc/service/EgovDateUtil.java`; do not add DB access or schema changes.
- Frontend shared search:
  - Modify `frontend/src/shared/components/f1-grid/types/grid.types.ts` to define fixed/system-relative date expressions and `search.defaultValue`.
  - Modify `frontend/src/shared/components/page-search/searchFields.ts` to carry default metadata into page search fields.
  - Create `frontend/src/shared/services/systemDateService.ts` to fetch and validate the backend date.
  - Create `frontend/tests/system-date-service.test.ts` to verify the API path, response shape, and real-date validation.
  - Create `frontend/src/shared/components/page-search/searchDefaults.ts` to validate and resolve fixed and relative date-range values.
  - Create `frontend/src/shared/hooks/usePageSearchDefaults.ts` to resolve field defaults before pages issue their initial query and expose loading/error/retry state.
  - Modify `frontend/src/shared/hooks/usePageSessionState.ts` to support deferring persistence until asynchronous page defaults are ready; add a focused regression test.
  - Modify `frontend/src/shared/components/PageSearchArea.tsx` to initialize and reset date inputs from resolved default values, and expose an optional page-level reset callback.
  - Modify `frontend/tests/page-search-fields.test.ts`, `frontend/tests/page-search-area-detail.test.tsx`, and create `frontend/tests/search-defaults.test.ts` for metadata propagation, UI defaults/reset, calendar arithmetic, and invalid inputs.
- Document-status integration:
  - Modify `frontend/src/pages/groupware/documents/status/components/DocumentStatusGrid.tsx` to declare recent-month `submittedAt` defaults using system-date offsets.
  - Modify `frontend/src/pages/groupware/documents/status/DocumentStatusPage.tsx` to use the resolved default snapshot for first query, session fallback, and reset; remove browser-clock date construction and surface date-service errors without using the browser date.
  - Extend `frontend/tests/document-status-page.test.tsx` to prove server-date-derived filters are sent on initial entry and reset, persisted/restored correctly, and the grid does not issue an earlier unfiltered request.
- Project documents:
  - Create `docs/directions/20261020/20261020_013_F1-Grid_날짜검색_기본값_작업지시서.md`.
  - Create `docs/plan/20261020/20261020_013_F1-Grid_날짜검색_기본값_계획서.md`.
  - Create `docs/spec/20261020/20261020_013_F1-Grid_날짜검색_기본값_상세사양서.md`.
  - Modify `frontend/src/pages/f1-grid-docs/F1-GRID.md`.
  - Create `docs/result/20261020/f1-grid-date-search-default/result.md`.

### Task 1: Record the dated implementation instructions and specification

**Files:**
- Create: `docs/directions/20261020/20261020_013_F1-Grid_날짜검색_기본값_작업지시서.md`
- Create: `docs/plan/20261020/20261020_013_F1-Grid_날짜검색_기본값_계획서.md`
- Create: `docs/spec/20261020/20261020_013_F1-Grid_날짜검색_기본값_상세사양서.md`

- [ ] **Step 1: Write the work direction**

Record approved requirements: date search defaults support fixed `year/month/day` and `systemDate` with optional integer offsets in years/months/days; each range endpoint is independently optional; first entry and reset apply defaults; server date is authoritative; errors do not fall back to browser time; no DB changes.

- [ ] **Step 2: Write the dated plan**

List the backend endpoint, typed metadata, resolver, date search area integration, document-status migration, tests, documentation, and exact commands from this implementation plan. Keep the implementation order test-first.

- [ ] **Step 3: Write the detailed specification**

Specify:

```ts
type F1GridDateDefault =
  | { type: 'fixed'; year: number; month: number; day: number }
  | {
      type: 'systemDate';
      offset?: { years?: number; months?: number; days?: number };
    };

type F1GridDateRangeDefault = {
  from?: F1GridDateDefault;
  to?: F1GridDateDefault;
};
```

`search.defaultValue` is of type `F1GridDateRangeDefault` and applies only to a search field, not row cells. Relative offsets apply years, then months, then days using calendar arithmetic. An absent endpoint remains empty. The API is `GET /api/v1/common/system-date`, returning `result.today` in `yyyy-MM-dd` format.

### Task 2: Expose the backend system date

**Files:**
- Create: `backend/src/test/java/egovframework/com/common/controller/CommonSystemDateApiControllerTest.java`
- Create: `backend/src/main/java/egovframework/com/common/controller/CommonSystemDateApiController.java`
- Reuse: `backend/src/main/java/egovframework/let/utl/fcc/service/EgovDateUtil.java`

- [ ] **Step 1: Write a failing endpoint contract test**

Construct the controller with `new ResultVoHelper()` and an authenticated `LoginVO`, then call its date handler. Assert response result code is `ResponseCode.SUCCESS.getCode()` and `result.today` is a valid `yyyy-MM-dd` date. Also assert an unauthenticated principal is rejected. Normalize `EgovDateUtil.getToday()` (`yyyyMMdd`) with `LocalDate.parse(..., DateTimeFormatter.BASIC_ISO_DATE)`; do not call `getCurrentDate("yyyy-MM-dd")`, whose current implementation routes that pattern into its time-string overload.

- [ ] **Step 2: Run the test and verify it fails because the endpoint is absent**

Run from `backend`:

```powershell
mvn "-Dtest=CommonSystemDateApiControllerTest" test
```

Expected: compilation/test fails because `CommonSystemDateApiController` does not exist.

- [ ] **Step 3: Implement the common date endpoint**

Create an authenticated `@RestController` under `/api/v1` with `@GetMapping("/common/system-date")`. Inject `ResultVoHelper`, parse `EgovDateUtil.getToday()` with `DateTimeFormatter.BASIC_ISO_DATE`, place the resulting ISO date in a result map under `today`, and return the map with `ResponseCode.SUCCESS`. Do not read from the database or compute a date in the frontend.

- [ ] **Step 4: Run the backend endpoint test**

Run:

```powershell
mvn "-Dtest=CommonSystemDateApiControllerTest" test
```

Expected: the endpoint test passes and confirms the ISO response shape.

### Task 3: Add typed date defaults and a resolver

**Files:**
- Modify: `frontend/src/shared/components/f1-grid/types/grid.types.ts`
- Modify: `frontend/src/shared/components/page-search/searchFields.ts`
- Create: `frontend/src/shared/services/systemDateService.ts`
- Create: `frontend/tests/system-date-service.test.ts`
- Create: `frontend/src/shared/components/page-search/searchDefaults.ts`
- Modify: `frontend/tests/page-search-fields.test.ts`
- Create: `frontend/tests/search-defaults.test.ts`

- [ ] **Step 1: Add metadata propagation test**

Add a date column with `search.defaultValue` containing `from: { type: 'systemDate', offset: { months: -1 } }` and `to: { type: 'fixed', year: 2026, month: 10, day: 20 }`. Assert `toPageSearchFields` returns both expressions without changing the search field order, label, type, or span.

- [ ] **Step 2: Run the metadata test and verify failure**

Run from `frontend`:

```powershell
npx vitest run tests/page-search-fields.test.ts
```

Expected: the assertion fails because `search.defaultValue` is not part of the column or page-search field types and is not propagated.

- [ ] **Step 3: Add the date default types and propagate the metadata**

Add `F1GridDateDefault` and `F1GridDateRangeDefault` to the F1-Grid public type module. Add optional `defaultValue` to `F1GridColumnSearchOptions`, and an optional typed `defaultValue` field to `PageSearchField`. Copy the metadata in `toPageSearchFields` only when defined.

- [ ] **Step 4: Add resolver tests for fixed, relative, partial, and boundary dates**

Test that fixed `2026-10-20` remains unchanged; `2026-10-20` minus one month resolves to `2026-09-20`; `2026-03-31` minus one month resolves to `2026-02-28`; `2024-03-31` minus one month resolves to leap-day `2024-02-29`; `2026-03-01` minus one day resolves to `2026-02-28`; an omitted `to` endpoint stays empty; invalid dates such as February 30 throw a validation error; and non-integer offsets or defaults on non-date fields are rejected. Add service tests proving `getSystemDate()` calls `/api/v1/common/system-date`, returns `today` from the API result, and rejects malformed or impossible dates.

- [ ] **Step 5: Run resolver tests and verify failure**

Run:

```powershell
npx vitest run tests/search-defaults.test.ts tests/system-date-service.test.ts
```

Expected: test fails because no resolver exists.

- [ ] **Step 6: Implement system-date retrieval and resolver**

Implement `getSystemDate()` in `systemDateService.ts` using `apiGet<{ today: string }>('/api/v1/common/system-date')`. Validate that the response is a real `yyyy-MM-dd` date; throw an explicit error for invalid data.

In `searchDefaults.ts`, export a resolver that:

1. accepts date search fields and a `getToday` function defaulting to `getSystemDate`;
2. requests the system date once only when at least one endpoint uses `type: 'systemDate'`;
3. validates every fixed date and integer offset;
4. applies years, then months, then days using `dayjs` calendar arithmetic;
5. returns a `Record<string, PageSearchFieldValue>` whose date fields are `{ from, to }` and whose unspecified endpoints are empty.

- [ ] **Step 7: Run metadata and resolver tests**

Run:

```powershell
npx vitest run tests/page-search-fields.test.ts tests/search-defaults.test.ts tests/system-date-service.test.ts
```

Expected: both files pass, including month-end/leap-day arithmetic and invalid-date rejection.

### Task 4: Apply defaults in the shared detailed-search area

**Files:**
- Modify: `frontend/src/shared/components/PageSearchArea.tsx`
- Modify: `frontend/tests/page-search-area-detail.test.tsx`
- Modify: `frontend/tests/page-search-area.test.tsx`

- [ ] **Step 1: Add UI tests for initialization and reset**

Render a date field with fixed start/end defaults and pass resolved `defaultValues` from the shared resolver. Verify the values appear in the start/end inputs on first open, the reset button restores them after edits, and a date field without `defaultValue` resets to empty. Assert `onDetailValuesChange` receives the reset values and `onDetailSearch` is not called by reset, preserving the existing search-area behavior. When `onDetailReset` is provided, assert it receives the reset values.

- [ ] **Step 2: Add UI test for absent resolved defaults**

Render a date field without a `defaultValues` entry. Assert the input remains empty and no browser date is inferred. The default hook and document-status page own API failure display and retry behavior; `PageSearchArea` only renders already-resolved values.

- [ ] **Step 3: Run the PageSearchArea tests and confirm the new assertions fail**

Run:

```powershell
npx vitest run tests/page-search-area-detail.test.tsx tests/page-search-area.test.tsx
```

Expected: the new default/reset assertions fail because the component currently clears all detailed values and has no default-value or reset callback props.

- [ ] **Step 4: Integrate resolved defaults into initial values and reset**

Add optional `defaultValues` and `onDetailReset` props to `PageSearchArea`. Use `defaultValues[field.field]` when no explicit field value exists. On reset, set draft values to the resolved defaults, call `onDetailValuesChange` with those values, then call `onDetailReset` if supplied. Do not call `onDetailSearch` from reset; consumers without `onDetailReset` retain the existing no-query reset behavior. Do not call `Date`, `new Date()`, or `Date.now()` to resolve `systemDate`.

### Task 5: Provide a shared resolved-default hook

**Files:**
- Create: `frontend/src/shared/hooks/usePageSearchDefaults.ts`
- Create: `frontend/tests/use-page-search-defaults.test.tsx`

- [ ] **Step 1: Write hook tests**

Use date search fields containing one fixed default and one system-date-relative default. Assert the hook returns a loading state before resolution, the correct values after the mocked API date resolves, does not call the API when fields use only fixed defaults, and returns an error plus a retry function when the service rejects. Assert retry calls the service again and then resolves the values.

- [ ] **Step 2: Run the hook test and verify failure**

Run:

```powershell
npx vitest run tests/use-page-search-defaults.test.tsx
```

Expected: failure because the hook does not exist.

- [ ] **Step 3: Implement the hook**

Implement `usePageSearchDefaults(fields)` with `{ values: Record<string, PageSearchFieldValue> | null, loading, error, retry }`. Keep `values` null until resolution succeeds. Resolve values using `resolvePageSearchDefaults`; use the service default for `systemDate` expressions. Reject default resolution on malformed configuration or API failure, and expose retry without substituting a browser date.

- [ ] **Step 4: Run the hook and search-area tests**

Run:

```powershell
npx vitest run tests/use-page-search-defaults.test.tsx tests/page-search-area-detail.test.tsx tests/page-search-area.test.tsx
```

Expected: all new hook/default/reset assertions pass and existing search-area tests retain their prior semantics.

### Task 6: Defer persistence until asynchronous defaults resolve

**Files:**
- Modify: `frontend/src/shared/hooks/usePageSessionState.ts`
- Modify: `frontend/tests/page-session-state.test.tsx`

- [ ] **Step 1: Add a regression test for disabled persistence**

Mount a component that calls `usePageSessionState` with `persistWhen: false`; assert state initializes from storage but no new storage value is written when storage is empty. Rerender with `persistWhen: true`; assert the current state is then persisted. Also assert the default option continues to persist immediately for existing callers.

- [ ] **Step 2: Run the focused hook test and verify failure**

Run `npx vitest run tests/page-session-state.test.tsx`. Expected: the test fails because the options type has no `persistWhen` and the hook always persists.

- [ ] **Step 3: Add opt-in persistence gating**

Add optional `persistWhen?: boolean | ((value: T) => boolean)` to `PageSessionStateOptions<T>`, defaulting to `true`. Skip only the persistence effect when the boolean is false or the predicate returns false; do not change session loading, validation, reset, or storage-error behavior. Include `persistWhen` in the effect dependencies.

- [ ] **Step 4: Run the focused session hook test**

Run `npx vitest run tests/page-session-state.test.tsx`. Expected: the new gated-persistence assertion and existing persistence/reset tests pass.

### Task 7: Move document-status defaults to column metadata and gate first query

**Files:**
- Modify: `frontend/src/pages/groupware/documents/status/components/DocumentStatusGrid.tsx`
- Modify: `frontend/src/pages/groupware/documents/status/DocumentStatusPage.tsx`
- Modify: `frontend/tests/document-status-page.test.tsx`

- [ ] **Step 1: Update document-status tests to use a server-date response**

Extend the mocked `api.get` to return `{ today: '2026-10-20' }` for `/api/v1/common/system-date`. Assert the initial list request uses `submittedAtFrom=2026-09-20` and `submittedAtTo=2026-10-20`. Assert no document-list request is sent until the system-date response is resolved.

- [ ] **Step 2: Add failure and reset contract tests**

Assert a rejected system-date request shows the page error with a retry button and does not trigger an unfiltered first list request; clicking retry requests the system date again. Update the reset test to assert server-date-derived default values after reset, no keyword/title filters, and the same values after session restore.

- [ ] **Step 3: Run the focused status-page tests and verify new assertions fail**

Run:

```powershell
npx vitest run tests/document-status-page.test.tsx
```

Expected: new server-date/reset assertions fail before the metadata integration. Keep the pre-existing `updatedAt` metadata expectation failure separate and unchanged.

- [ ] **Step 4: Declare the document-status date search default**

In the `submittedAt` column search metadata, set:

```ts
defaultValue: {
  from: { type: 'systemDate', offset: { months: -1 } },
  to: { type: 'systemDate' },
}
```

- [ ] **Step 5: Initialize filters and session from resolved metadata**

Remove `getDefaultSubmittedAtRange` and all browser `Date` usage for the submitted-date default. Initialize the page session hook with `null`, a validator that accepts `null` or a valid `DocumentStatusSearchSession`, and `persistWhen: (value) => value !== null`; this preserves an existing valid session but does not write a placeholder while the server date is loading. Make state initializers null-safe (`searchSession?.keyword ?? ''` and empty detail values when it is null). When the resolver succeeds and no session was restored, set keyword/detail values and applied filters from the resolved default snapshot, then persist that snapshot. When a valid session was restored, keep its values as the applied filters. Do not mount the grid until defaults resolve; on failure, show an explicit error with a button wired to the defaults hook's `retry` function and keep the grid from making a request with missing default filters.

- [ ] **Step 6: Apply the resolved default snapshot on page reset**

Pass `resetSearch` through `PageSearchArea.onDetailReset`. Reset the keyword and other detail conditions, preserve the resolved `submittedAt` default, apply it to the list query, and store the same reset snapshot in `s-erp:page:document-status`. Re-entry should restore the persisted date and query without recomputing a different browser date.

- [ ] **Step 7: Run document-status tests**

Run:

```powershell
npx vitest run tests/document-status-page.test.tsx
```

Expected: the new server-date initial/reset/session cases pass. Report the existing `updatedAt` metadata test separately; do not change its hidden metadata in this task.

### Task 8: Update F1-Grid documentation and verification record

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Create: `docs/result/20261020/f1-grid-date-search-default/result.md`
- Create screenshots under: `docs/result/20261020/f1-grid-date-search-default/screenshots/`

- [ ] **Step 1: Document date-search metadata**

Explain the `search.defaultValue.from/to` shape, fixed and `systemDate` expressions, year/month/day offsets, calendar-end behavior, initial/reset behavior, server date source, and the difference between search defaults and row-cell defaults.

- [ ] **Step 2: Run focused frontend verification**

Run:

```powershell
Set-Location frontend
npx vitest run tests/page-search-fields.test.ts tests/search-defaults.test.ts tests/system-date-service.test.ts tests/use-page-search-defaults.test.tsx tests/page-search-area-detail.test.tsx tests/page-search-area.test.tsx tests/page-session-state.test.tsx tests/document-status-page.test.tsx
npm run build
Set-Location ..
git --no-pager diff --check
```

Expected: new tests pass; report any unrelated pre-existing failure without changing its source. Build exits successfully, with any bundle-size warning noted accurately; diff check returns exit code 0.

- [ ] **Step 3: Verify the page at responsive browser sizes**

Run the frontend on the documented strict port `4173`, open the document-status page, and verify the initial date range and reset behavior at viewport widths `375`, `768`, and `1280` pixels. Capture screenshots under `docs/result/20261020/f1-grid-date-search-default/screenshots/`. If authentication or server availability prevents the browser check, record the exact limitation in the result document rather than claiming the check passed.

- [ ] **Step 4: Run focused backend verification**

Run from `backend`:

```powershell
mvn "-Dtest=CommonSystemDateApiControllerTest" test
```

Expected: endpoint test passes; no database or migration work is required.

- [ ] **Step 5: Record actual verification**

Write the changed file list, endpoint shape, date-expression examples, test outcomes, build output, API failure behavior, and browser test limitations to the result document. Do not claim browser verification unless the page is opened and checked at 375px, 768px, and 1280px.

## Self-Review

- The approved requirements map to Tasks 2–7: server-owned today, typed fixed/relative defaults, date arithmetic boundaries, independent range endpoints, initial/reset behavior, session precedence, visible API errors, and tests. Task 8 covers the F1-Grid documentation, responsive browser verification, and result record.
- The backend change is a read-only date API only; no DB/API data-table contract or schema is modified.
- `F1GridDateDefault`, `F1GridDateRangeDefault`, `PageSearchField.defaultValue`, the `result.today` API property, and the document-status `submittedAt` metadata use consistent names throughout the plan.
- The initial date-dependent list request is explicitly gated on server-date resolution; the shared reset preserves existing behavior unless a page opts into `onDetailReset`.
- Session persistence is not allowed to overwrite an existing user snapshot with a temporary empty/default placeholder while the server-date request is pending.
