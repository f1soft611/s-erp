# Document Status Search Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use `search.group` to place document-status detailed-search fields in four requested rows, remove the duplicate date caption, and preserve ungrouped span behavior.

**Architecture:** Keep `toPageSearchFields` as the metadata converter. In `PageSearchArea`, render contiguous grouped fields in fresh five-column rows, with `searchSpan` continuing to size fields within grouped and ungrouped rows. Change only the document-status group metadata, preserving its existing span values, and add focused tests/documentation; leave search values and API filters unchanged.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Vite.

---

## File map

- `frontend/src/shared/components/PageSearchArea.tsx` — partition consecutive group runs, draw each group as a fresh responsive five-column row, apply `searchSpan` within every row, and remove the date caption.
- `frontend/src/pages/groupware/documents/status/components/DocumentStatusGrid.tsx` — assign the four ordered groups and preserve existing field spans.
- `frontend/tests/page-search-area-detail.test.tsx` — verify group rows, fallback spans, date labels, and unchanged date values.
- `frontend/tests/document-status-page.test.tsx` — verify document-status field order and group assignments.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md` — explain group row layout and `searchSpan` compatibility.
- `docs/directions/20261016/20261016_017_문서현황_상세검색_그룹_행배치_작업지시서.md`
- `docs/plan/20261016/20261016_017_문서현황_상세검색_그룹_행배치_계획서.md`
- `docs/spec/20261016/20261016_017_문서현황_상세검색_그룹_행배치_상세사양서.md`
- `docs/result/20261016/document-status-page-search-groups/result.md` — add execution evidence and browser screenshots that do not expose document rows/body.

## Task 1: Add failing tests for grouped search layout

**Files:**
- Modify: `frontend/tests/page-search-area-detail.test.tsx`
- Modify: `frontend/tests/document-status-page.test.tsx`

- [x] **Step 1: Add a group layout fixture to PageSearchArea tests**

Add a dedicated test with ordered fields:

```tsx
const groupedFields: PageSearchField[] = [
  { field: 'from', label: '시작일', type: 'date', searchSpan: 4, group: 'date' },
  { field: 'status', label: '결재상태', type: 'select', searchSpan: 2, group: 'filters' },
  { field: 'kind', label: '문서종류', type: 'select', searchSpan: 2, group: 'filters' },
  { field: 'title', label: '제목', type: 'text', searchSpan: 4, group: 'title' },
  { field: 'drafter', label: '기안자', type: 'text', searchSpan: 1, group: 'people' },
  { field: 'department', label: '기안부서', type: 'text', searchSpan: 1, group: 'people' },
  { field: 'participant', label: '결재 참여자', type: 'text', searchSpan: 1, group: 'people' },
];
```

Render `PageSearchArea`, open 상세 검색, then assert group containers identified by `data-search-group` exist in the sequence `date`, `filters`, `title`, `people`; status and kind are children of the same group; the controls retain their `searchSpan` widths inside group rows; and people has three field controls.

- [x] **Step 2: Add date-caption and date-value assertions**

In the existing date test, assert the visible date caption text (`생성일`) is absent, while `getByLabelText('생성일 시작일')` and `getByLabelText('생성일 종료일')` both remain available. Keep the existing `{ from, to }` update assertion.

- [x] **Step 3: Add grouped and ungrouped span assertions**

Render grouped and ungrouped fields using `searchSpan: 2` and `searchSpan: 3`. Assert the grouped row creates a fresh row boundary, span widths are applied within it, ungrouped fields remain in the outer grid, and their existing `searchSpan` placement remains. Add a `data-search-span` marker only if needed to assert actual placement without relying on generated Emotion class names; do not change production semantics just for the test.

- [x] **Step 4: Assert document-status group metadata**

In `frontend/tests/document-status-page.test.tsx`, extend the existing metadata test to assert visible fields are ordered as `submittedAt`, `documentStatus`, `documentType`, `title`, `drafterName`, `drafterDepartmentName`, `participantName`, and that group values are respectively `결재신청일`, `결재상태`, `결재상태`, `제목`, `기안정보`, `기안정보`, `기안정보`. Assert these field column definitions retain spans 4, 2, 2, and 4 for the date, status, type, and title; actor fields keep the default span.

- [x] **Step 5: Run tests to verify the new assertions fail**

Run from `frontend`:

```powershell
npm run test -- tests/page-search-area-detail.test.tsx tests/document-status-page.test.tsx
```

Expected: failures indicate missing group wrappers and the still-visible date caption; existing tests remain otherwise runnable.

## Task 2: Implement generic grouped rows and date caption removal

**Files:**
- Modify: `frontend/src/shared/components/PageSearchArea.tsx`

- [x] **Step 1: Partition fields into ordered render blocks**

Inside `PageSearchArea`, derive ordered blocks from `detailFields` in their current order. Each block is either a consecutive run of fields with the same non-empty `group`, or one standalone ungrouped field. Do not reorder fields or merge separated runs of the same group.

Use a local discriminated union such as:

```tsx
type SearchRenderBlock =
  | { group: string; fields: PageSearchField[] }
  | { field: PageSearchField };
```

Iterate fields once: append a grouped field to the last block only when the last block has the same group; otherwise append a new group block. Always create a standalone block for an ungrouped field.

- [x] **Step 2: Preserve ungrouped controls and wrap grouped rows**

Keep the existing outer five-column grid and each ungrouped control's `gridColumn` computed from `searchSpan`. Render a group block as an outer item spanning all columns (`gridColumn: '1 / -1'`) containing a nested five-column grid. Use one column at `xs`, two columns at `sm`, and five columns at `md` and above. Within each group row, compute each field's responsive `gridColumn` from `searchSpan` using the existing rules (`xs: 'span 1'`, `sm: 'span Math.min(searchSpan, 2)'`, `md: 'span searchSpan'`). Add `data-search-group={group}` to the row for stable testing and preserve `searchSpan` for every field.

- [x] **Step 3: Remove only the date caption**

In the `date` control branch, remove the `Typography` showing `field.label`. Keep each `TextField`'s visible `label`, `aria-label`, and update logic unchanged.

- [x] **Step 4: Run focused search component tests**

Run:

```powershell
npm run test -- tests/page-search-area-detail.test.tsx tests/page-search-fields.test.ts
```

Expected: grouped layout, ungrouped `searchSpan`, date label, and date range behavior tests pass.

## Task 3: Configure the document-status groups

**Files:**
- Modify: `frontend/src/pages/groupware/documents/status/components/DocumentStatusGrid.tsx`
- Test: `frontend/tests/document-status-page.test.tsx`

- [x] **Step 1: Assign groups and ordering**

Set groups while preserving existing `span` values:

```tsx
submittedAt: { label: '결재신청일', order: 1, span: 4, group: '결재신청일' }
documentStatus: { label: '결재상태', order: 2, span: 2, group: '결재상태' }
documentType: { label: '문서종류', order: 3, span: 2, group: '결재상태' }
title: { label: '제목', order: 4, span: 4, group: '제목' }
drafterName: { label: '기안자', order: 6, group: '기안정보' }
drafterDepartmentName: { label: '기안부서', order: 7, group: '기안정보' }
participantName: { label: '결재 참여자', order: 8, group: '기안정보' }
```

Keep quick-search support for the keyword unchanged; `eabusNo` remains hidden from detailed search.

- [x] **Step 2: Run focused document-status tests**

Run:

```powershell
npm run test -- tests/document-status-page.test.tsx tests/document-status-service.test.ts
```

Expected: metadata, quick search, detailed filters, and service tests pass without API query changes.

## Task 4: Update user-facing F1-Grid documentation

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`

- [x] **Step 1: Explain group-row behavior**

Update the detailed-search metadata guidance to say that `search.group` creates row boundaries for consecutive matching fields, while `search.span` remains the width control for fields inside grouped and ungrouped rows. Document that group labels are not displayed as headings and the group order follows the sorted search field order.

- [x] **Step 2: Update the document-status example**

Describe its four groups and retained span widths (date 4, status/type 2 each, title 4, people 1 each by default); clarify that the two date input labels remain accessible and that date values/API filters are unchanged.

## Task 5: Record project docs and execute verification

**Files:**
- Modify: `docs/plan/20261016/20261016_017_문서현황_상세검색_그룹_행배치_계획서.md`
- Modify: `docs/spec/20261016/20261016_017_문서현황_상세검색_그룹_행배치_상세사양서.md`
- Modify: `docs/result/20261016/document-status-page-search-groups/result.md`
- Verify: `docs/directions/20261016/20261016_017_문서현황_상세검색_그룹_행배치_작업지시서.md`

- [x] **Step 1: Mark plan steps and preserve completion evidence**

Update this plan's checkboxes from actual execution only. Keep the approved scope in the dated direction and specification consistent with the code.

- [x] **Step 2: Run the focused test set**

Run from `frontend`:

```powershell
npm run test -- tests/page-search-area-detail.test.tsx tests/page-search-fields.test.ts tests/document-status-page.test.tsx tests/document-status-service.test.ts
```

Expected: all selected files pass with zero failed tests.

- [x] **Step 3: Build the frontend**

Run from `frontend`:

```powershell
npm run build
```

Expected: TypeScript and Vite build exit successfully; record any existing bundle warning without broadening scope.

- [ ] **Step 4: Verify browser layout at all required widths**

Blocked: the integrated browser connection timed out, and headless Playwright was redirected to `/login`. The target page layout could not be inspected without authenticated access; no credentials were read or attempted.

Use the existing S-ERP browser at `http://127.0.0.1:4173/groupware/doc/read`; open detailed search and inspect 375px, 768px, and 1280px. Confirm the four logical groups, date inputs, responsive wrapping, and no page-level horizontal overflow. Capture screenshots only when they do not contain real document row/body data; otherwise record that privacy limitation instead.

- [x] **Step 5: Record result evidence**

Create `docs/result/20261016/document-status-page-search-groups/result.md` with changed files/behavior, test and build command results, viewport checks, and screenshot paths or the reason screenshots were omitted.

- [x] **Step 6: Check diff integrity**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; preserve unrelated working-tree changes and do not commit code without user direction.
