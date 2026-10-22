# Customer Auto-Hyphen Formatting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable F1-Grid `inputFormat` options that automatically format customer registration and contact numbers across editing, paste, and detailed search.

**Architecture:** Define declarative format metadata and one pure formatter in the shared F1-Grid editing layer. Apply the formatter at each existing user-input boundary and propagate column metadata into detailed-search fields. Customer columns opt into generic digit grouping or the Korean phone preset; columns without the option keep current behavior.

**Tech Stack:** React, TypeScript, Vitest, MUI TextField, F1-Grid.

---

## Files and responsibilities

- `frontend/src/shared/components/f1-grid/types/grid.types.ts`: shared `inputFormat` type and optional column property.
- `frontend/src/shared/components/f1-grid/editing/inputFormat.ts`: pure formatter for generic digit grouping and Korean phone numbers.
- `frontend/src/shared/components/f1-grid/editing/CellEditor.tsx`: normalize inline text input and preserve cursor position.
- `frontend/src/shared/components/f1-grid/form/GridFormField.tsx`: normalize row-form text input.
- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`: format pasted cell values through the same helper.
- `frontend/src/shared/components/page-search/searchFields.ts`: carry format metadata from columns into search fields.
- `frontend/src/shared/components/PageSearchArea.tsx`: format detailed-search text input through the shared helper.
- `frontend/src/pages/co/master/customers/components/CustomerGrid.tsx`: opt customer fields into the approved formats.
- `frontend/tests/f1-grid-input-sanitizer.test.tsx`: add component regressions for formatted entry and paste.
- `frontend/tests/customer-number-input.test.ts`: test generic and Korean format outputs.
- `frontend/tests/page-search-fields.test.ts` and `frontend/tests/page-search-area-detail.test.tsx`: verify format metadata propagation and search input behavior.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`: document the shared column option and supported behavior.
- `docs/directions/20261022/20261022_008_거래처_관리_페이지_작업지시서.md`: replace the previous no-auto-hyphen requirement.
- `docs/plan/20261022/20261022_008_거래처_관리_페이지_계획서.md` and `docs/spec/20261022/20261022_008_거래처_관리_페이지_상세사양서.md`: record the approved behavior.
- `docs/result/20261022/customer-management/20261022_008_거래처_관리_페이지_결과.md`: record cause, behavior, and regression verification.

## Task 1: Add a shared declarative format and pure formatter

**Files:**
- Modify: `frontend/src/shared/components/f1-grid/types/grid.types.ts`
- Create: `frontend/src/shared/components/f1-grid/editing/inputFormat.ts`
- Test: `frontend/tests/customer-number-input.test.ts`

- [x] **Step 1: Add failing formatter tests**

Test the following input/output pairs:

```ts
expect(formatF1GridInput('1234567890', { type: 'digits', groupSizes: [3, 2] }))
  .toBe('123-45-67890');
expect(formatF1GridInput('1234567890123', { type: 'digits', groupSizes: [6] }))
  .toBe('123456-7890123');
expect(formatF1GridInput('12a345', { type: 'digits' })).toBe('12345');
expect(formatF1GridInput('01012345678', { type: 'korean-phone' }))
  .toBe('010-1234-5678');
expect(formatF1GridInput('0212345678', { type: 'korean-phone' }))
  .toBe('02-1234-5678');
expect(formatF1GridInput('021234567', { type: 'korean-phone' }))
  .toBe('02-123-4567');
```

Also cover partial values, already hyphenated input, non-digit removal, and retaining digits beyond the expected group lengths.

- [x] **Step 2: Run the focused test and confirm it fails**

Run from `frontend`: `npm run test -- tests/customer-number-input.test.ts`

Expected: FAIL because `formatF1GridInput` and the input-format type do not exist yet.

- [x] **Step 3: Define the format metadata and formatter**

Add this public configuration shape in `grid.types.ts` and use it on `F1GridColumn`:

```ts
export type F1GridInputFormat =
  | { type: 'digits'; groupSizes?: number[]; separator?: string }
  | { type: 'korean-phone' };
```

`groupSizes` lists the digit counts before separators; remaining digits stay in the final group. With no `groupSizes`, keep only digits. The `korean-phone` branch uses `02` grouping for 9/10-digit numbers and 3-digit area/mobile-prefix grouping for 10/11-digit numbers. Partial digits are retained and extra digits are not rejected.

- [x] **Step 4: Re-run formatter tests**

Run from `frontend`: `npm run test -- tests/customer-number-input.test.ts`

Expected: all tests in that file PASS.

## Task 2: Apply shared formatting to grid editing and paste

**Files:**
- Modify: `frontend/src/shared/components/f1-grid/editing/CellEditor.tsx`
- Modify: `frontend/src/shared/components/f1-grid/form/GridFormField.tsx`
- Modify: `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- Test: `frontend/tests/f1-grid-input-sanitizer.test.tsx`

- [x] **Step 1: Add failing inline-editor, row-form, and paste tests**

Configure a text column with `inputFormat: { type: 'digits', groupSizes: [3, 2] }`. Verify typing `1234567890` reports `123-45-67890` from both `CellEditor` and `GridFormField`, and TSV paste writes that same formatted value into the draft row. Verify a column without `inputFormat` still preserves ordinary text.

- [x] **Step 2: Run the focused test and confirm the new cases fail**

Run from `frontend`: `npm run test -- tests/f1-grid-input-sanitizer.test.tsx`

Expected: the new formatter assertions FAIL before implementation.

- [x] **Step 3: Normalize input at all three grid boundaries**

Use `formatF1GridInput` when `column.inputFormat` is present in inline editing, row-form changes, and TSV paste. Keep `sanitizeInput` behavior unchanged for columns that do not opt into the new option. Avoid formatting initial render values. For inline text input, map the selection using the count of digits before the old caret so inserted separators do not unexpectedly move the caret to the end.

- [x] **Step 4: Re-run grid input tests**

Run from `frontend`: `npm run test -- tests/f1-grid-input-sanitizer.test.tsx`

Expected: all tests in that file PASS.

## Task 3: Propagate formatting into detailed search

**Files:**
- Modify: `frontend/src/shared/components/page-search/searchFields.ts`
- Modify: `frontend/src/shared/components/PageSearchArea.tsx`
- Test: `frontend/tests/page-search-fields.test.ts`
- Test: `frontend/tests/page-search-area-detail.test.tsx`

- [x] **Step 1: Add failing metadata and search-input tests**

Verify `toPageSearchFields` copies a column's `inputFormat` into its resulting search field. Render a text detailed-search field configured with digit groups and verify typing `1234567890` updates the value as `123-45-67890`. Confirm unconfigured text search remains unchanged.

- [x] **Step 2: Run focused search tests and confirm the new cases fail**

Run from `frontend`: `npm run test -- tests/page-search-fields.test.ts tests/page-search-area-detail.test.tsx`

Expected: the new metadata and formatted-input assertions FAIL before implementation.

- [x] **Step 3: Carry and apply the format option**

Add the optional format property to `PageSearchField`, copy it from its F1-Grid column, and pass text input changes through `formatF1GridInput` when configured. Preserve the existing `sanitizeInput` path for existing search fields.

- [x] **Step 4: Re-run detailed-search tests**

Run from `frontend`: `npm run test -- tests/page-search-fields.test.ts tests/page-search-area-detail.test.tsx`

Expected: all tests in both files PASS.

## Task 4: Configure customer fields and update behavior documentation

**Files:**
- Modify: `frontend/src/pages/co/master/customers/components/CustomerGrid.tsx`
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Modify: `docs/directions/20261022/20261022_008_거래처_관리_페이지_작업지시서.md`
- Modify: `docs/plan/20261022/20261022_008_거래처_관리_페이지_계획서.md`
- Modify: `docs/spec/20261022/20261022_008_거래처_관리_페이지_상세사양서.md`
- Modify: `docs/result/20261022/customer-management/20261022_008_거래처_관리_페이지_결과.md`
- Test: `frontend/tests/customer-management-page.test.tsx`

- [x] **Step 1: Add failing customer-column configuration tests**

Verify business number uses `{ type: 'digits', groupSizes: [3, 2] }`, corporate registration number uses `{ type: 'digits', groupSizes: [6] }`, telephone and fax use `{ type: 'korean-phone' }`, and postal code uses `{ type: 'digits' }`.

- [x] **Step 2: Run the focused customer page test**

Run from `frontend`: `npm run test -- tests/customer-management-page.test.tsx`

Expected: the new configuration assertions FAIL before customer columns opt in.

- [x] **Step 3: Configure fields and correct the task documents**

Set the approved format on each field. Update the work instruction, plan, and detailed specification to require automatic hyphen insertion for business/corporate numbers and Korean telephone/fax patterns, while keeping postal code as digits-only five-digit standard. Document that formatting does not enforce length or change API/DB values and does not rewrite an existing value until edited. Update F1-Grid guidance with examples for the shared option and the result report with root cause and regression cases.

- [x] **Step 4: Run all focused regression tests**

Run from `frontend`:

```powershell
npm run test -- tests/customer-number-input.test.ts tests/f1-grid-input-sanitizer.test.tsx tests/customer-management-page.test.tsx tests/page-search-fields.test.ts tests/page-search-area-detail.test.tsx
```

Expected: all selected tests PASS, including the existing sanitizer and customer-page regressions.

## Task 5: Verify final frontend changes

**Files:** All files listed above.

- [x] **Step 1: Run the frontend production build**

Run from `frontend`: `npm run build`

Expected: TypeScript compilation and Vite build exit successfully. Existing chunk-size warnings may remain.

- [x] **Step 2: Check whitespace errors**

Run from the repository root: `git diff --check`

Expected: exit code 0 with no whitespace errors.

- [x] **Step 3: Review the scoped diff**

Confirm changes are limited to shared F1-Grid input formatting, customer column configuration, relevant tests, and directly related documentation. Preserve all unrelated pre-existing working-tree changes. Do not commit, merge, push, or discard changes; the user selected keeping the current branch and working-tree changes.
