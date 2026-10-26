# Sales Order Field Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce only the vertical spacing between sales-order basic-information field rows to 8px while preserving 16px horizontal spacing.

**Architecture:** Keep the existing page grid and fields intact. Specify independent MUI `columnGap` and `rowGap` values on the existing grid and lock them with a page-level regression test.

**Tech Stack:** React, TypeScript, MUI `sx`, Vitest, Testing Library, Vite.

---

### Task 1: Add a failing grid-spacing regression test

**Files:**
- Modify: `frontend/tests/sales-order-create-page.test.tsx`

- [x] **Step 1: Assert the required grid gaps in the existing page render test**

After rendering the page in the first test, add:

```tsx
const formGrid = screen.getByLabelText('수주번호')
  .closest('.MuiFormControl-root')
  ?.parentElement;
expect(formGrid).toHaveStyle({ columnGap: '16px', rowGap: '8px' });
```

- [x] **Step 2: Run the test and confirm the expected failure**

Run from `frontend`: `npm run test -- tests/sales-order-create-page.test.tsx`

Expected: the new assertion fails because the existing `gap: 2` gives the row gap as 16px.

### Task 2: Make only the vertical gap compact

**Files:**
- Modify: `frontend/src/pages/sales/order/create/SalesOrderCreatePage.tsx`

- [x] **Step 1: Replace the shared grid gap**

Change only the basic-information grid spacing from:

```tsx
gap: 2,
```

to:

```tsx
columnGap: 2,
rowGap: 1,
'& > .MuiFormControl-root': { m: 0 },
'& > .MuiStack-root': { mt: 0 },
```

- [x] **Step 2: Run the focused regression suite**

Run from `frontend`: `npm run test -- tests/sales-order-create-page.test.tsx tests/master-picker.test.tsx tests/sales-order-scroll.test.tsx`

Expected: all 10 existing and new tests pass.

### Task 3: Verify and document responsive rendering

**Files:**
- Create: `docs/result/20261026/sales-order-field-spacing/20261026_011_수주등록_기본정보_필드간격_개선_결과.md`
- Create: `docs/result/20261026/sales-order-field-spacing/screenshots/` captures at 375px, 768px, and 1280px

- [x] **Step 1: Build**

Run from `frontend`: `npm run build`

Expected: TypeScript and Vite finish successfully.

- [x] **Step 2: Verify the existing route at three viewports**

Use the existing S-ERP Vite server at `http://127.0.0.1:4173`; do not stop a server that was already running. Verify the form remains in bounds without page-level horizontal overflow at 375px, 768px, and 1280px, and capture each viewport.

- [x] **Step 3: Record actual results**

Document test/build output, each viewport observation, and screenshot links. State whether local login or an isolated synthetic browser context was used.

**Execution status (2026-10-26):** The first browser measurement showed that reducing only the CSS grid row gap left a 32px visual field gap because MUI applies 16px top and 8px bottom margins, plus the picker’s own 16px top offset. The basic-info grid now resets those local margins and keeps an 8px row gap, producing actual 8px field-to-field spacing while preserving 16px horizontal spacing and picker alignment. The 10 focused tests and production build passed. Chromium confirmed 8px row gap, 16px column gap, no page overflow, and aligned desktop rows at 375px, 768px, and 1280px. An isolated synthetic auth/menu API context was used because normal local login was rejected; no real credentials or business data were used. Screenshots are under `docs/result/20261026/sales-order-field-spacing/screenshots/`.
