# Sales Source Layout Implementation Plan

> **For agentic workers:** Execute these steps inline in order. Steps use checkbox (`- [ ]`) syntax for tracking. Do not create a commit unless explicitly requested.

**Goal:** Make the frontend source tree reflect the Sales Management menu branches by nesting shipment plans and statements under delivery.

**Architecture:** Keep feature-local components, services, and types together. Move complete feature directories and update all importers without changing page or API behavior.

**Tech Stack:** React, TypeScript, Vitest, Playwright browser-flow scripts, Oxlint.

---

### Task 1: Prove the new feature paths are required

**Files:**
- Modify: `frontend/tests/sales-delivery-plan-page.test.tsx`
- Modify: `frontend/tests/sales-delivery-plan-api.test.ts`
- Modify: `frontend/tests/sales-statement-page.test.tsx`
- Modify: `frontend/tests/statement-print-layout.test.tsx`
- Modify: `frontend/tests/sales-delivery-item-flow.browser.mjs`

- [ ] Update only imports/dynamic imports to `sales/delivery/plan/...` and `sales/delivery/statement/...`.
- [ ] Run the focused Vitest files and confirm failure is caused by the not-yet-moved modules.

### Task 2: Move the feature directories

**Files:**
- Move: `frontend/src/pages/sales/delivery-plan/` to `frontend/src/pages/sales/delivery/plan/`
- Move: `frontend/src/pages/sales/statement/` to `frontend/src/pages/sales/delivery/statement/`

- [ ] Move all feature files together, preserving their relative substructure.
- [ ] Correct relative imports from moved source files to `shared`, `dashboard`, `order`, and `delivery/create`.
- [ ] Update only the two feature import groups in `frontend/src/pages/dashboard/components/DashboardContent.tsx`; preserve existing quotation routing edits.

### Task 3: Verify imports and behavior

**Files:**
- Create: `docs/result/20261116/sales-source-layout/20261116_015_영업관리_화면소스_구조정리_결과서.md`

- [ ] Run `npm run test -- tests/sales-delivery-plan-page.test.tsx tests/sales-delivery-plan-api.test.ts tests/sales-statement-page.test.tsx tests/statement-print-layout.test.tsx tests/dashboard-data.test.tsx`.
- [ ] Run `node tests/sales-delivery-item-flow.browser.mjs` from `frontend`.
- [ ] Run `npm run build`.
- [ ] Run `npm run lint --` with the changed TS/TSX file paths.
- [ ] Search active `frontend/src` and `frontend/tests` for old feature imports, excluding API URL strings.
- [ ] Record exact validation results; no screenshot is required because the UI is unchanged.
