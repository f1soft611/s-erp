# Document Write Display Date Implementation Plan

> **For agentic workers:** Use inline execution for this small, cohesive change. Follow the dated direction, plan, and detailed specification before editing application code. Preserve unrelated worktree edits.

**Goal:** Display a consistent document date using submission date, then modification date, then creation date across the document-writing feed, list, detail panel, and notice panel.

**Architecture:** Add a pure helper in the document-writing feature data layer that selects a non-empty date and its source label. The page hook uses it to map list/feed/notice records; `DocumentApprovalDetailFeed` uses it for detail-backed metadata. The notice panel uses the mapped date and source label without adding API fields.

**Tech Stack:** React, TypeScript, Vitest, React Testing Library, Vite.

---

## File map

- Create `docs/directions/20261016/20261016_014_문서작성_날짜표시_우선순위_작업지시서.md`: approved scope and completion criteria.
- Create `docs/plan/20261016/20261016_014_문서작성_날짜표시_우선순위_계획서.md`: file map, test-first sequence, and verification.
- Create `docs/spec/20261016/20261016_014_문서작성_날짜표시_우선순위_상세사양서.md`: source priority, empty-value semantics, surfaces, and display behavior.
- Create `frontend/src/pages/groupware/documents/write/data/documentDate.ts`: pure date selection helper and source-label type.
- Modify `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`: optional source-label field for mapped document items.
- Modify `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts`: select/format the same date when mapping list, feed, and notices.
- Modify `frontend/src/pages/groupware/documents/write/components/ApprovalNoticePanel.tsx`: show the mapped source label and selected date.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`: select the preferred date for feed and right-side detail metadata, including the approval-line drafter metadata.
- Test `frontend/tests/document-date.test.ts`: pure helper priority and empty-value behavior.
- Modify `frontend/tests/use-document-write-page.test.tsx`: mapped date and source label for list and notice records.
- Modify `frontend/tests/document-write-page.test.tsx`: rendered feed, detail panel, approval-line, list, and right notice-panel date regressions. This file and the detail component already have unrelated uncommitted changes; preserve them and make only date-focused edits.
- Create `docs/result/20261016/document-write-display-date/result.md` and screenshots at 375px, 768px, and 1280px.

## Task 1: Write the required dated direction, plan, and detailed specification

**Files:**
- Create the three dated documentation files listed above.
- Reference the approved design at `docs/superpowers/specs/2026-10-16-document-write-display-date-design.md`.

- [ ] **Step 1: Write the direction**

Record this requirement verbatim in meaning: display the first non-empty value in `submittedAt`, `updatedAt`, `createdAt` order across feed, list, document detail/right-side detail, and “놓치지 마세요”. If all values are missing or empty, retain each surface's existing empty-date presentation. Do not change date formatting, API behavior, or date persistence.

- [ ] **Step 2: Write the implementation plan**

List the helper, mapping, presentation, tests, build, browser viewports, result document, and screenshots. State that the two already-dirty target files must be edited surgically without dropping existing changes.

- [ ] **Step 3: Write the detailed specification**

Specify that null, undefined, and empty strings fall through; selected values use the current `YYYY.MM.DD` formatting; the notice panel labels the selected source as `상신일`, `수정일`, or `작성일`; and an unavailable date retains the existing dash/empty layout.

## Task 2: Add failing date-mapping tests

**Files:**
- Modify `frontend/tests/use-document-write-page.test.tsx`.

- [x] **Step 1: Test the expected mapping through the hook**

Use `it.each` with all three dates present, missing submission date, empty submission date with no modification date, and missing modification date. For each case, assert the mapped document date and source label for both list and notice records. This tests the required behavior through the existing `useDocumentWritePage` API without importing the not-yet-created selector.

- [x] **Step 2: Run the hook test to verify it fails for the missing behavior**

Run from `frontend`: `npx vitest run tests/use-document-write-page.test.tsx`

Run: `npx vitest run tests/use-document-write-page.test.tsx`

Expected: four date cases fail on missing `dateSourceLabel` and/or empty-string fallback; existing filter-reset tests remain green.

## Task 3: Implement the shared selector and mapped notice/list date

**Files:**
- Create `frontend/src/pages/groupware/documents/write/data/documentDate.ts`.
- Create `frontend/tests/document-date.test.ts`.
- Modify `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`.
- Modify `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts`.
- Modify `frontend/src/pages/groupware/documents/write/components/ApprovalNoticePanel.tsx`.

- [ ] **Step 1: Add direct selector tests before adding the implementation**

Create `frontend/tests/document-date.test.ts` and use `it.each` with these cases and expected values/labels:

```ts
[
  [{ submittedAt: '2026-10-14', updatedAt: '2026-10-15', createdAt: '2026-10-12' }, '2026-10-14', '상신일'],
  [{ submittedAt: null, updatedAt: '2026-10-15', createdAt: '2026-10-12' }, '2026-10-15', '수정일'],
  [{ submittedAt: '', updatedAt: null, createdAt: '2026-10-12' }, '2026-10-12', '작성일'],
  [{ submittedAt: '', updatedAt: '', createdAt: null }, '', undefined],
]
```

The test calls `getDocumentDisplayDate(input)` and asserts the returned object has exactly the selected `value` and optional `sourceLabel`. The already-observed hook test failure establishes RED for the behavior before this helper exists.

- [ ] **Step 2: Add the typed selector**

Implement the following behavior in `documentDate.ts`:

```ts
export type DocumentDateSourceLabel = '상신일' | '수정일' | '작성일';

export type DocumentDateFields = {
  submittedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

export function getDocumentDisplayDate(
  fields: DocumentDateFields,
): { value: string; sourceLabel?: DocumentDateSourceLabel } {
  if (fields.submittedAt) {
    return { value: fields.submittedAt, sourceLabel: '상신일' };
  }
  if (fields.updatedAt) {
    return { value: fields.updatedAt, sourceLabel: '수정일' };
  }
  if (fields.createdAt) {
    return { value: fields.createdAt, sourceLabel: '작성일' };
  }
  return { value: '' };
}
```

- [ ] **Step 3: Expose the optional source label on mapped documents**

Add `dateSourceLabel?: DocumentDateSourceLabel` to `DocumentWriteItem`. Import the selector and label type in the page hook. In `mapDocument`, compute the selector once and return:

```ts
const displayDate = getDocumentDisplayDate(record);
date: formatDate(displayDate.value),
dateSourceLabel: displayDate.sourceLabel,
submittedDate: formatDate(record.submittedAt),
```

Retain `submittedDate` for existing consumers; do not use it as the display fallback.

- [ ] **Step 4: Use the mapped source in the notice panel**

Change the date row to:

```tsx
[item.dateSourceLabel ?? '일자', item.date || '—'],
```

Keep all layout and click behavior unchanged.

- [ ] **Step 5: Run helper and mapping tests**

Run from `frontend`: `npx vitest run tests/document-date.test.ts tests/use-document-write-page.test.tsx`

Expected: PASS for source priority, empty-string fallback, list mapping, and notice mapping.

## Task 4: Use the selector in feed and right-side detail metadata

**Files:**
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`.
- Modify `frontend/tests/document-write-page.test.tsx`.

- [ ] **Step 1: Add an integration regression for detail-backed dates**

Extend the existing document-detail test data with a missing submission date and distinct fallback values:

```ts
submittedAt: '2026-10-14T11:00:00Z',
updatedAt: '2026-10-15T11:00:00Z',
createdAt: '2026-10-12T09:00:00Z',
```

Set `submittedAt: null`, `updatedAt: '2026-10-15T11:00:00Z'`, and `createdAt: '2026-10-12T09:00:00Z'` in the detail fixture; expect `2026.10.15` in both `approval-author-meta` and `approval-line-drafter-meta`. Assert that the author metadata is not `white-space: nowrap`. The feed fixture has all three values and asserts that its author metadata uses the selected submission date `2026.10.14`.

- [ ] **Step 2: Run the focused UI test to verify it fails**

Run from `frontend`: `npx vitest run tests/document-write-page.test.tsx`

Expected: FAIL because detail/feed metadata currently renders `createdAt` directly.

- [ ] **Step 3: Select the display date for detail metadata**

Import `getDocumentDisplayDate` into `DocumentApprovalDetailFeed.tsx`. For the detail author row, approval-line drafter metadata, and feed-card `meta`, compute the date with `getDocumentDisplayDate(detail).value` and pass it through the existing `formatApprovalDate`. Preserve the current author text, view count, separators, and fallback to `props.feedItem.date` when no detail is available. Remove `noWrap` from the detail author metadata so its date remains fully visible on narrow screens. Do not change comment timestamps or action dates.

- [ ] **Step 4: Run focused date and page tests**

Run from `frontend`: `npx vitest run tests/document-date.test.ts tests/use-document-write-page.test.tsx tests/document-write-page.test.tsx`

Expected: PASS, including the existing detail panel, feed, and list behavior.

## Task 5: Verify, document results, and capture the browser states

**Files:**
- Create `docs/result/20261016/document-write-display-date/result.md`.
- Create screenshots under `docs/result/20261016/document-write-display-date/screenshots/`.

- [ ] **Step 1: Run the focused frontend tests**

Run from `frontend`: `npx vitest run tests/document-date.test.ts tests/use-document-write-page.test.tsx tests/document-write-page.test.tsx`

Expected: all selected tests pass.

- [ ] **Step 2: Run the production build**

Run from `frontend`: `npm run build`

Expected: TypeScript project build and Vite production build complete successfully.

- [ ] **Step 3: Verify the existing browser page at required widths**

Use the existing S-ERP page at `http://127.0.0.1:4173/groupware/doc/write`; verify 375px, 768px, and 1280px. Confirm the date value and source label in the notice panel and confirm feed, list, and selected detail metadata use the same priority. Save screenshots using lowercase English names in the result `screenshots` directory. Do not start another server if the shared page is already available.

- [ ] **Step 4: Write the result report**

Record the test/build commands and outcomes, browser viewport checks, screenshot paths, and any unavailable scenario. Do not claim a viewport was checked if it was not.

## Self-review

- **Spec coverage:** source priority, empty strings, existing formatting, list/feed/detail/approval-line/notice surfaces, notice source label, focused tests, build, browser widths, and dated result evidence all have explicit tasks.
- **Placeholder scan:** no TBD/TODO instructions are used; paths, command lines, expected date values, and code behavior are defined.
- **Type consistency:** `DocumentDateSourceLabel`, `DocumentDateFields`, and `getDocumentDisplayDate` are defined before their use; `dateSourceLabel` is optional to preserve existing `DocumentWriteItem` literals.
