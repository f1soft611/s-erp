# Sales Page Spacing and Grid Border Alignment Implementation Plan

> **For agentic workers:** Execute inline, task by task. Preserve existing worktree changes. Do not commit unless explicitly requested.

**Goal:** Match the four sales registration pages' outer spacing to the current status-page spacing and remove the extra frame around the delivery-plan status grid.

**Architecture:** Keep status-page spacing as the reference: `px: { xs: 1, sm: 2 }, pt: 1, pb: 2`. Apply that to normal registration content wrappers while preserving embedded content and the documented order-save error exception. Align status messages with F1Grid using an opt-in horizontal padding mode, preserving defaults elsewhere and avoiding a duplicate gutter inside the delivery-plan status content wrapper. Replace only the redundant outlined Paper around the delivery-plan status F1Grid with a layout Box; retain the grid's own border.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Oxlint, Vite.

---

### Task 1: Add failing registration/status spacing checks

**Files:**
- Modify: `frontend/tests/sales-order-create-page.test.tsx`
- Modify: `frontend/tests/sales-delivery-page.test.tsx`
- Modify: `frontend/tests/sales-delivery-plan-page.test.tsx`
- Modify: `frontend/tests/sales-statement-page.test.tsx`
- Modify: `frontend/tests/sales-order-status-page.test.tsx`

- [ ] **Step 1: Assert top and bottom padding on all four registration pages**

In the existing registration render tests, find the page's named content region and assert:

```tsx
expect(contentRegion).toHaveStyle({
  paddingTop: '8px',
  paddingBottom: '16px',
});
```

Keep the existing compact order-save error test unchanged; it covers the documented error exception. Keep embedded content's zero-padding behavior unchanged.

- [ ] **Step 2: Assert status pages retain their current top and bottom padding**

In existing status render tests, locate `data-testid="sales-status-content"` and assert the same `paddingTop: '8px'` and `paddingBottom: '16px'`. Add focused shared-component tests for the opt-in `grid` and `none` horizontal-padding modes, verifying default message padding remains unchanged. In status-page tests, assert message wrappers align with the same grid gutter. In the delivery-plan status test, assert that the F1Grid direct parent is not `.MuiPaper-outlined` and that the grid itself retains a 1px border.

- [ ] **Step 3: Run the tests and verify they fail before implementation**

Run from the repository root:

```powershell
npm --prefix frontend run test -- tests/sales-order-create-page.test.tsx tests/sales-order-status-page.test.tsx tests/sales-delivery-page.test.tsx tests/sales-delivery-plan-page.test.tsx tests/sales-statement-page.test.tsx
```

Expected: registration padding checks fail because the registration wrappers use different padding; status message alignment and grid-border checks fail until implementation. The known detail-grid row-height assertion (`28.8px` vs expected `32px`) is unrelated and must not be changed here.

### Task 2: Apply status spacing to registration wrappers

**Files:**
- Modify: `frontend/src/pages/sales/order/create/SalesOrderCreatePage.tsx`
- Modify: `frontend/src/pages/sales/delivery/create/SalesDeliveryCreatePage.tsx`
- Modify: `frontend/src/pages/sales/delivery-plan/create/SalesDeliveryPlanCreatePage.tsx`
- Modify: `frontend/src/pages/sales/statement/SalesStatementCreatePage.tsx`
- Restore: status wrappers to `px: { xs: 1, sm: 2 }, pt: 1, pb: 2` in the sales order, delivery, delivery-plan, and statement status pages.
- Modify: `frontend/src/shared/components/PageMessageArea.tsx`
- Modify: `frontend/src/shared/components/SearchResultMessage.tsx`

- [ ] **Step 1: Use the status spacing on normal registration content**

On each non-embedded registration content wrapper, use:

```tsx
px: { xs: 1, sm: 2 },
pt: 1,
pb: 2,
```

For conditional wrappers, preserve the existing embedded `p: 0`. On `SalesOrderCreatePage`, also preserve the existing save-error-specific 16px all-side padding because it balances the compact error message as documented.

- [ ] **Step 2: Align status messages without changing their vertical spacing**

Messages outside the status content wrapper use the responsive grid gutter; delivery-plan status messages inside its content wrapper use no additional horizontal padding. Keep shared-message defaults unchanged. Each status content wrapper remains:

```tsx
px: { xs: 1, sm: 2 },
pt: 1,
pb: 2,
```

Retain the `sales-status-content` test selector. Do not change search fields, message vertical spacing, or grid behavior.

- [ ] **Step 3: Run the five relevant page test files**

Run the command from Task 1. Expected: the new registration/status spacing assertions pass; preserve and report the existing unrelated delivery-plan row-height test failure if it remains.

### Task 3: Remove the redundant delivery-plan status grid frame

**Files:**
- Modify: `frontend/src/pages/sales/delivery-plan/status/SalesDeliveryPlanStatusPage.tsx`
- Test: `frontend/tests/sales-delivery-plan-page.test.tsx`

- [ ] **Step 1: Replace the outlined Paper shell with a borderless Box**

Use the Box below around the F1Grid, preserving the existing flex sizing and overflow:

```tsx
<Box data-testid="delivery-plan-status-grid-shell" sx={{ flex: 1, minHeight: 240, minWidth: 0, overflow: 'hidden' }}>
```

Remove the unused `Paper` import. Do not alter F1Grid core styles.

- [ ] **Step 2: Verify the grid-border assertions**

Run:

```powershell
npm --prefix frontend run test -- tests/sales-delivery-plan-page.test.tsx
```

Expected: the direct parent is not an outlined Paper and the F1Grid's computed `borderWidth` remains `1px`.

### Task 4: Validate and document

**Files:**
- Review: the eight sales registration/status page files listed in the spec.
- Create: `docs/result/20261110/sales-page-layout/20261110_006_sales_page_spacing_grid_border_결과서.md`
- Create: `docs/result/20261110/sales-page-layout/screenshots/` images for the responsive comparison.

- [ ] **Step 1: Run focused tests, build, lint, and diff check**

Run:

```powershell
npm --prefix frontend run test -- tests/sales-order-create-page.test.tsx tests/sales-order-status-page.test.tsx tests/sales-delivery-page.test.tsx tests/sales-delivery-plan-page.test.tsx tests/sales-statement-page.test.tsx
npm --prefix frontend run build
npm --prefix frontend run lint -- src/pages/sales/order/create/SalesOrderCreatePage.tsx src/pages/sales/delivery/create/SalesDeliveryCreatePage.tsx src/pages/sales/delivery-plan/create/SalesDeliveryPlanCreatePage.tsx src/pages/sales/statement/SalesStatementCreatePage.tsx src/pages/sales/delivery-plan/status/SalesDeliveryPlanStatusPage.tsx
git diff --check
```

- [ ] **Step 2: Compare browser layouts at 375px, 768px, and 1280px**

Compare each registration content region with its corresponding status content region. Confirm equal outer spacing, no horizontal overflow, and only the F1Grid standard border around the delivery-plan status list. Save screenshots in the result folder.

- [ ] **Step 3: Write the result report**

Record the corrected direction (registration adopts status spacing), the delivery-plan single-border change, exact test/build/lint outcomes, browser sizes, screenshot links, and the unrelated test failure if present. Do not claim API or backend behavior changed.
