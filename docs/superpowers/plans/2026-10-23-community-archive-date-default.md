# Community Archive Date Default Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply a server-date-based recent calendar year to the archive upload-date filter on initial entry and after reset.

**Architecture:** Declare the range on the archive `PageSearchField` using the existing date-default metadata and resolve it with `usePageSearchDefaults`. Keep archive list loading disabled until resolution succeeds, then use that same resolved range for the fields, summary, initial list filters, and reset.

**Tech Stack:** React, TypeScript, MUI, dayjs, Vitest, React Testing Library.

---

## File map

- Modify `frontend/src/pages/groupware/community/archive/ArchiveBoardPage.tsx`: declare the uploaded-date default, resolve it, display retryable resolution errors, initialize fields and applied filters, and apply the default during reset.
- Modify `frontend/src/pages/groupware/community/archive/hooks/useArchiveList.ts`: allow the page to suppress the first request until resolved filters are ready; remove the browser-clock date initializer.
- Modify `frontend/tests/archive-page.test.tsx`: verify default date fields/filters, pending and failed default resolution, retry, and reset behavior.
- Modify `frontend/tests/archive-board-service.test.ts`: verify the list hook sends no request while disabled and uses filters provided before it is enabled.
- Modify `docs/spec/20261020/20261020_009_커뮤니티_자료실_검색_파일목록_상세사양서.md`: clarify server-date basis and reset behavior.
- Create `docs/plan/20261023/20261023_011_커뮤니티_자료실_올린날짜_기본값_계획서.md` and `docs/spec/20261023/20261023_011_커뮤니티_자료실_올린날짜_기본값_상세사양서.md`: retain the dated project workflow records.
- Create `docs/result/20261023/community-archive-date-default/20261023_011_커뮤니티_자료실_올린날짜_기본값_결과.md` and screenshots for 375px, 768px, and 1280px: record verification and screenshots.

Existing formatting and delete-dialog-order edits in the two archive page/dialog files are unrelated and must be preserved.

### Task 1: Specify archive date default and reset requirements

**Files:**
- Create: `docs/plan/20261023/20261023_011_커뮤니티_자료실_올린날짜_기본값_계획서.md`
- Create: `docs/spec/20261023/20261023_011_커뮤니티_자료실_올린날짜_기본값_상세사양서.md`
- Modify: `docs/spec/20261020/20261020_009_커뮤니티_자료실_검색_파일목록_상세사양서.md`

- [ ] **Step 1: Record the plan and detailed behavior**

Document that `uploadedAt` uses `{ from: { type: 'systemDate', offset: { years: -1 } }, to: { type: 'systemDate' } }`, resolved from the existing system-date endpoint; the list request waits for successful resolution; reset reapplies this range, restores the initial file type, clears the keyword, and preserves the folder.

- [ ] **Step 2: Review specification coverage**

Confirm that the dated specification covers initial state, reset, server-date failure/retry, no unbounded first request, manually edited open-ended ranges, and the absence of backend or database changes.

### Task 2: Add failing page behavior tests

**Files:**
- Modify: `frontend/tests/archive-page.test.tsx`

- [ ] **Step 1: Mock the shared system date**

Add `getSystemDate` to the test's hoisted archive services, mock `../src/shared/services/systemDateService` while preserving its other exports, and return the fixed server date `2024-02-29` by default. This differs from the browser date and covers leap-year subtraction.

```ts
const archiveServices = vi.hoisted(() => ({
  getSystemDate: vi.fn(),
  fetchArchiveFiles: vi.fn(),
  uploadArchiveFile: vi.fn(),
  updateArchiveFile: vi.fn(),
  deleteArchiveAttachment: vi.fn(),
  downloadArchiveAttachment: vi.fn(),
  fetchCommonCodeGroups: vi.fn(),
  fetchCommonCodeItems: vi.fn(),
  createCommonCodeItem: vi.fn(),
  updateCommonCodeItem: vi.fn(),
}));
```

- [ ] **Step 2: Assert initial server-derived range and list filters**

Extend the initial date test to assert both controls and the first `fetchArchiveFiles` call use `2023-02-28` through `2024-02-29`. The summary must show `최근 1년`.

- [ ] **Step 3: Assert pending and failed resolution**

Add a deferred `getSystemDate` test: render the page, verify `fetchArchiveFiles` has not been called before resolving the date, resolve it to `2024-02-29`, and verify the first request contains the derived range. Add a rejection test verifying a visible retry action and no file-list call; clicking retry and resolving the date must then start the request.

- [ ] **Step 4: Assert reset reapplies defaults**

Open detailed search, alter both dates and file type, set a quick keyword, and click `초기화`. Verify the fields return to `2023-02-28` / `2024-02-29`, the keyword clears, the type returns to `ALL`, the current folder remains selected, and the last list request contains the reset conditions.

- [ ] **Step 5: Run the focused test to confirm failure**

Run from `frontend`: `npm run test -- tests/archive-page.test.tsx`.

Expected: the new date, readiness, retry, and reset assertions fail against the existing browser-clock initialization and missing archive reset callback.

### Task 3: Resolve defaults before the first archive request

**Files:**
- Modify: `frontend/src/pages/groupware/community/archive/ArchiveBoardPage.tsx`
- Modify: `frontend/src/pages/groupware/community/archive/hooks/useArchiveList.ts`

- [ ] **Step 1: Declare metadata for the archive date field**

Add the approved metadata to the `uploadedAt` entry in `DETAIL_FIELDS`:

```ts
defaultValue: {
  from: { type: 'systemDate', offset: { years: -1 } },
  to: { type: 'systemDate' },
},
```

- [ ] **Step 2: Gate archive requests**

Change `useArchiveList` to require an `enabled` boolean so callers must explicitly opt in to list requests. Keep initial `uploadedFrom` and `uploadedTo` empty rather than calculating them from `dayjs()`, and return from its fetch effect while disabled. Initialize `isLoading` as false so disabled loading is represented by the defaults hook rather than a request that never started. Update existing hook tests to pass `true` when testing active fetches and test the disabled-to-enabled transition with resolved date filters.

- [ ] **Step 3: Resolve defaults in the page**

Call `usePageSearchDefaults(DETAIL_FIELDS)`. Until resolution succeeds, keep archive list loading disabled. On success, initialize the detail values and set archive filters to the resolved `uploadedAt` range, empty keyword, current initial folder, and `ALL` type; then enable fetching.

- [ ] **Step 4: Surface resolver errors and retry**

Render a retryable error alert from `defaultsError` using `retryDefaults`. Keep detailed search disabled while defaults are loading, unavailable, or the archive list is loading. Do not substitute `dayjs()` or issue an empty-date list request after failure.

- [ ] **Step 5: Run the focused test**

Run from `frontend`: `npm run test -- tests/archive-page.test.tsx`.

Expected: initialization, no-early-request, and resolver retry tests pass; the reset assertion remains failing until Task 4.

### Task 4: Apply the resolved range on reset

**Files:**
- Modify: `frontend/src/pages/groupware/community/archive/ArchiveBoardPage.tsx`
- Modify: `frontend/tests/archive-page.test.tsx`

- [ ] **Step 1: Use resolved values for date summary**

Update `getDateSummary` to compare the applied range to the resolved default range instead of calling `dayjs()` for the current date. Keep `전체 기간` and open-ended range labels unchanged.

- [ ] **Step 2: Connect archive reset behavior**

Pass the resolved values as `defaultValues` and an `onDetailReset` callback to `PageSearchArea`. In the callback, store the reset values, clear `searchDraft`, and set archive filters to the callback's date range, `ALL` file type, and current folder. Preserve the existing date-order check in `handleDetailSearch`.

- [ ] **Step 3: Run focused archive tests**

Run from `frontend`: `npm run test -- tests/archive-page.test.tsx`.

Expected: initial date, delayed resolution, retry, summary, and reset assertions pass without changing folder navigation or manually edited open-ended ranges.

### Task 5: Update related documentation and capture result evidence

**Files:**
- Modify: `docs/spec/20261020/20261020_009_커뮤니티_자료실_검색_파일목록_상세사양서.md`
- Create: `docs/result/20261023/community-archive-date-default/20261023_011_커뮤니티_자료실_올린날짜_기본값_결과.md`
- Create screenshots at 375px, 768px, and 1280px only if an authenticated browser page is available.

- [ ] **Step 1: Update existing archive search documentation**

Replace the vague “initial entry date” basis with the server system date; specify the calendar-year range and that detailed-search reset reapplies it, resets keyword/file type, and preserves folder navigation. Document the retryable error and request gating.

- [ ] **Step 2: Capture browser screenshots**

Use the existing `http://127.0.0.1:4173` S-ERP browser session if responsive and authenticated. If accessible, capture the archive page at 375px, 768px, and 1280px, with the detailed search opened and its resolved dates visible. If no authenticated page is available, do not fabricate screenshots; record the access limitation in the result document. Do not stop or restart a server that was already running.

- [ ] **Step 3: Write the result record**

Record changed behavior, test/build commands and their actual results, browser viewports, screenshot paths, and any browser/API access limitation. Do not claim screenshot or browser verification if it could not be performed.

### Task 6: Verify the complete change

**Files:**
- Verify all changed files

- [ ] **Step 1: Run focused tests**

Run from `frontend`: `npm run test -- tests/archive-page.test.tsx`.

Expected: exit code 0 and the archive page tests pass.

- [ ] **Step 2: Run frontend build**

Run from `frontend`: `npm run build`.

Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 3: Check patch formatting**

Run from repository root: `git diff --check`.

Expected: no whitespace errors.

- [ ] **Step 4: Verify browser behavior and record evidence**

Check initial resolution, reset, and rendered date inputs in the browser at the three required viewport widths. Record only directly observed results in the result document.
