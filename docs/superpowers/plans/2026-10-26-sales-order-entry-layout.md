# Sales Order Entry Layout Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the sales-order header fields into the approved rows and make the customer-picker button match the field height without changing behavior.

**Architecture:** Keep the existing `SalesOrderCreatePage` field order and card, use a four-column grid at desktop widths and existing narrower responsive columns, and constrain only the adjacent button in the shared picker. Preserve all page state, services, grid behavior, and save-disabled messaging.

**Tech Stack:** React, TypeScript, MUI `sx`, Vitest, Testing Library, Vite.

---

### Task 1: Lock picker button height with a focused regression test

**Files:**
- Modify: `frontend/tests/master-picker.test.tsx`

- [x] **Step 1: Add a failing test**

Add this test inside `describe('MasterPicker', ...)`:

```tsx
it('matches the adjacent picker button height to the small input height', () => {
  render(
    <MasterPicker
      label="거래처"
      value={null}
      search={vi.fn(async () => options)}
      onChange={() => undefined}
    />,
  );

  expect(screen.getByRole('button', { name: '거래처 선택' })).toHaveStyle({
    height: '40px',
    minHeight: '40px',
  });
});
```

- [x] **Step 2: Verify the test fails before the implementation**

Run from `frontend`: `npm run test -- tests/master-picker.test.tsx`

Expected: the new assertion fails because the picker button has no explicit 40px height.

### Task 2: Apply the approved header layout and picker alignment

**Files:**
- Modify: `frontend/src/pages/sales/order/create/SalesOrderCreatePage.tsx`
- Modify: `frontend/src/shared/components/master-picker/MasterPicker.tsx`

- [x] **Step 1: Use a four-column desktop header grid**

In `SalesOrderCreatePage.tsx`, set the grid breakpoints to one column below `sm`, two columns from `sm`, and four columns from `lg`:

```tsx
gridTemplateColumns: {
  xs: 'minmax(0, 1fr)',
  sm: 'repeat(2, minmax(0, 1fr))',
  lg: 'repeat(4, minmax(0, 1fr))',
},
```

Keep the fields in their current DOM order: order number, order date, customer, quotation number, delivery date, delivery place, delivery method, status, remark. Keep remark spanning the full row from `sm` upward.

- [x] **Step 2: Match the adjacent customer-picker button height**

In `MasterPicker.tsx`, add `height: 40` and `minHeight: 40` to the existing button `sx`, retaining its current width, disabled state, and behavior:

```tsx
sx={{ flexShrink: 0, minWidth: 76, height: 40, minHeight: 40 }}
```

- [x] **Step 3: Run focused frontend tests**

Run from `frontend`: `npm run test -- tests/master-picker.test.tsx tests/sales-order-create-page.test.tsx tests/sales-order-scroll.test.tsx`

Expected: all selected tests pass, including the new button-height assertion and existing order-entry behavior checks.

### Task 3: Verify responsive rendering and record the result

**Files:**
- Modify: `docs/plan/20261026/20261026_010_수주등록_레이아웃_개선_계획서.md`
- Modify: `docs/spec/20261026/20261026_010_수주등록_레이아웃_개선_상세사양서.md`
- Modify: `docs/result/20261026/sales-order-entry-layout/20261026_010_수주등록_레이아웃_개선_결과.md`
- Create: `docs/result/20261026/sales-order-entry-layout/screenshots/` captures for 375px, 768px, and 1280px

- [x] **Step 1: Run the production build**

Run from `frontend`: `npm run build`

Expected: TypeScript and Vite finish successfully.

- [ ] **Step 2: Verify real-browser layouts at required widths**

Open `/sales/order/create` in a browser at 375px, 768px, and 1280px. Confirm the 1280px form has the two approved four-field rows, the remark spans the card width, the adjacent picker button matches its input height, and the narrower views have no page-level horizontal overflow or clipped fields. Save one screenshot per width under the result directory.

- [x] **Step 3: Write the result record**

Record the changed layout, unchanged behavior, targeted test/build results, viewport observations, and screenshot links in the result document. Do not claim browser checks that were not completed.

**Execution status (2026-10-26):** The frontend build passed. The focused regression command for the three files listed in Task 2 passed all 9 tests. The existing S-ERP Vite listener on `127.0.0.1:4173` was reused. Chromium reached `/login` instead of `/sales/order/create`; the login form reported `로그인 정보가 올바르지 않습니다.` after submission. Consequently, no required viewport layout was verified and no screenshots were captured. The result record documents this blocker; Task 3 browser verification remains incomplete.
