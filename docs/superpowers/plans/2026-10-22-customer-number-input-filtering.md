# Customer Number Input Filtering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep customer business/contact fields and business/corporate detail-search inputs to digits and hyphens by stripping other characters as users type or paste.

**Architecture:** Add a reusable customer-scoped sanitizer and an optional per-column string-input normalizer to F1-Grid. Apply it to inline and row-form editors, propagate it to generated detailed-search fields, and leave unrelated columns and existing values untouched until edited.

**Tech Stack:** React, TypeScript, MUI, F1-Grid, Vitest, Testing Library.

---

## Files and Responsibilities

- Create `frontend/src/pages/co/master/customers/utils/customerNumberInput.ts` for the customer digit/hyphen sanitizer.
- Create `frontend/tests/customer-number-input.test.ts` for sanitizer behavior.
- Modify `frontend/src/shared/components/f1-grid/types/grid.types.ts` to add optional per-column string-input normalization.
- Modify `frontend/src/shared/components/f1-grid/editing/CellEditor.tsx`, `frontend/src/shared/components/f1-grid/form/GridFormField.tsx`, and `frontend/src/shared/components/f1-grid/core/F1Grid.tsx` to normalize user-entered and clipboard-pasted strings at the input boundary.
- Modify `frontend/src/shared/components/page-search/searchFields.ts` and `frontend/src/shared/components/PageSearchArea.tsx` to carry and apply the normalizer to generated search fields.
- Modify `frontend/src/pages/co/master/customers/components/CustomerGrid.tsx` to configure the five customer fields and two searchable number fields.
- Create `frontend/tests/f1-grid-input-sanitizer.test.tsx` for isolated inline and row-form editor tests, plus an F1-Grid clipboard paste regression.
- Modify focused tests in `frontend/tests/page-search-area-detail.test.tsx` and `frontend/tests/customer-management-page.test.tsx`.
- Update the customer direction, plan, specification, F1-Grid guide, and result report to describe the accepted behavior and verification.

## Task 1: Add and Test the Customer Sanitizer

**Files:**
- Create: `frontend/src/pages/co/master/customers/utils/customerNumberInput.ts`
- Create: `frontend/tests/customer-number-input.test.ts`

- [x] **Step 1: Write sanitizer tests first**

```ts
import { describe, expect, it } from 'vitest';
import { sanitizeCustomerNumberInput } from '../src/pages/co/master/customers/utils/customerNumberInput';

describe('sanitizeCustomerNumberInput', () => {
  it.each([
    ['012-345', '012-345'],
    ['AB012-3X', '012-3'],
    ['010 1234-5678', '0101234-5678'],
    ['-1--2-', '-1--2-'],
    ['', ''],
  ])('keeps only digits and hyphens in %j', (input, expected) => {
    expect(sanitizeCustomerNumberInput(input)).toBe(expected);
  });
});
```

- [x] **Step 2: Run the new test and confirm it fails because the helper is missing**

Run: `Set-Location frontend; npm run test -- tests/customer-number-input.test.ts`

Expected: FAIL because `customerNumberInput.ts` does not exist.

- [x] **Step 3: Implement the minimal sanitizer**

```ts
export function sanitizeCustomerNumberInput(value: string): string {
  return value.replace(/[^0-9-]/g, '');
}
```

- [x] **Step 4: Run the sanitizer test**

Run: `Set-Location frontend; npm run test -- tests/customer-number-input.test.ts`

Expected: 1 test file passes; digits and hyphens remain unchanged and all other characters are removed.

## Task 2: Normalize F1-Grid Inline and Row-Form Input

**Files:**
- Modify: `frontend/src/shared/components/f1-grid/types/grid.types.ts`
- Modify: `frontend/src/shared/components/f1-grid/editing/CellEditor.tsx`
- Modify: `frontend/src/shared/components/f1-grid/form/GridFormField.tsx`
- Modify: `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- Create: `frontend/tests/f1-grid-input-sanitizer.test.tsx`

- [x] **Step 1: Add failing focused tests**

Render `CellEditor` and `GridFormField` directly with a text column configured with `sanitizeInput: (value) => value.replace(/[^0-9-]/g, '')`. Enter `AB012-3X`; assert the respective `onChange`/`onPatch` receives `012-3`. Render an `F1Grid` with this column, paste `AB012-3X` as TSV, and assert `getChanges()` contains `012-3`. Add a plain text column without a sanitizer and assert its text remains unchanged.

- [x] **Step 2: Run the two focused tests and confirm the customer-form and inline expectations fail**

Run: `Set-Location frontend; npm run test -- tests/f1-grid-input-sanitizer.test.tsx`

Expected: Existing behavior retains nonnumeric characters in the filtered column and clipboard paste; the unaffected text field test passes.

- [x] **Step 3: Add the optional typed column callback**

In `F1GridColumn<T>`, add:

```ts
sanitizeInput?: (value: string) => string;
```

In `CellEditor`, wrap string `onChange` values:

```ts
const handleTextChange = (next: string) =>
  onChange(column.sanitizeInput?.(next) ?? next);
```

Pass `handleTextChange` to the text editor while preserving select, checkbox, date, user, and numeric behavior. In `GridFormField`, apply the same optional callback in its string `applyValue` path only. In `F1Grid.handlePaste`, apply `column.sanitizeInput` to clipboard text before `coerceClipboardValue`. Never normalize a field on render or form-open.

- [x] **Step 4: Re-run both focused test files**

Run: `Set-Location frontend; npm run test -- tests/f1-grid-input-sanitizer.test.tsx`

Expected: The focused editor tests pass; sanitized and unsanitized text columns retain their distinct behaviors. Do not use the existing broad `f1-grid.test.tsx` suite as the focused oracle: the pre-implementation baseline has 46 known failures in that file and one in `f1-grid-form-modal.test.tsx`.

## Task 3: Apply the Same Normalizer to Detailed Search

**Files:**
- Modify: `frontend/src/shared/components/page-search/searchFields.ts`
- Modify: `frontend/src/shared/components/PageSearchArea.tsx`
- Modify: `frontend/tests/page-search-area-detail.test.tsx`

- [x] **Step 1: Add a failing search-field test**

Create a text search field whose `sanitizeInput` strips non-digit/non-hyphen characters. Type `AB012-3X`; assert the controlled search value and submitted search value are both `012-3`. Verify a text field without a normalizer still accepts letters.

- [x] **Step 2: Run the detail-search test and confirm it fails before the implementation**

Run: `Set-Location frontend; npm run test -- tests/page-search-area-detail.test.tsx`

Expected: The filtered field still contains `AB012-3X`.

- [x] **Step 3: Carry the callback from grid metadata into the search field**

Add `sanitizeInput?: (value: string) => string` to `PageSearchField` and copy the callback in `toPageSearchFields`. In `PageSearchArea`, change the text input handler to:

```ts
onChange={(event) => {
  const input = event.target.value;
  updateValue(field.field, field.sanitizeInput?.(input) ?? input);
}}
```

- [x] **Step 4: Run the detail-search tests**

Run: `Set-Location frontend; npm run test -- tests/page-search-area-detail.test.tsx`

Expected: The new sanitization assertion and all existing detailed-search tests pass.

## Task 4: Configure Customer Fields and Update Project Documentation

**Files:**
- Modify: `frontend/src/pages/co/master/customers/components/CustomerGrid.tsx`
- Modify: `frontend/tests/customer-management-page.test.tsx`
- Modify: `docs/directions/20261022/20261022_008_거래처_관리_페이지_작업지시서.md`
- Modify: `docs/plan/20261022/20261022_008_거래처_관리_페이지_계획서.md`
- Modify: `docs/spec/20261022/20261022_008_거래처_관리_페이지_상세사양서.md`
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Modify: `docs/result/20261022/customer-management/20261022_008_거래처_관리_페이지_결과.md`

- [x] **Step 1: Add customer integration tests**

Assert `businessNo`, `juridNo`, `postCode`, `telephoneNo`, and `facsimileNo` columns all use the sanitizer in row-form and inline editing. Assert only `businessNo` and `juridNo` generated detailed-search fields use the same callback. Assert unrelated fields such as `customerName` have no sanitizer. Include a pre-existing value such as `legacy/A-10` and verify it is unchanged until edited.

- [x] **Step 2: Run the customer integration tests and confirm the sanitizer is not configured**

Run: `Set-Location frontend; npm run test -- tests/customer-management-page.test.tsx`

Expected: New column/search metadata assertions fail for the five fields and two search fields.

- [x] **Step 3: Wire the customer-specific sanitizer**

Import `sanitizeCustomerNumberInput` in `CustomerGrid.tsx`. Add `sanitizeInput: sanitizeCustomerNumberInput` only to the five named customer columns. The `businessNo` and `juridNo` column metadata must pass that same callback through to detailed search; other customer columns must remain unchanged.

- [x] **Step 4: Update the approved requirements and F1-Grid usage guide**

Document accepted input characters, stripping on type and paste, no hyphen placement/length enforcement, and preservation of unedited existing values. State explicitly that API/database types and schema remain unchanged.

- [x] **Step 5: Run focused tests and build**

Run:

```powershell
Set-Location frontend
npm run test -- tests/customer-number-input.test.ts tests/f1-grid-input-sanitizer.test.tsx tests/customer-management-page.test.tsx tests/page-search-area-detail.test.tsx
npm run build
git --no-pager diff --check
```

Expected: All selected tests pass, TypeScript and Vite build succeed, and `git diff --check` reports no whitespace errors. The known pre-existing failures in the broader grid suites remain out of scope.

- [x] **Step 6: Record final verification**

Update the result report with the focused test count and build outcome. Reuse the existing responsive captures because this behavior change does not alter page layout; do not create new screenshots unless the UI layout changes during implementation.

## Spec Coverage and Self-Review

- Input scope covers all five requested edit fields and both searchable business-number fields, including keyboard entry, input paste, and grid TSV paste.
- Invalid-character stripping is tested for typing/paste strings; hyphen format and field length are intentionally unconstrained.
- Existing values are only sanitized after user input, not when rendered or loaded.
- F1-Grid support remains opt-in; unrelated fields retain current behavior.
- No API contract, server-side behavior, or database schema changes are planned.
