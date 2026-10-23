# F1-Grid Input Format Digit Length Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable digit caps and completed-length validation to F1-Grid input formats, then configure customer number and contact fields.

**Architecture:** Extend the shared `inputFormat` metadata and formatter to cap digits at input boundaries. Extend `validateGridRow` to enforce configured allowed lengths on save, reusing existing row and grid validation presentation. Configure customer fields declaratively and update the applicable requirements and result documentation.

**Tech Stack:** React, TypeScript, Vitest, F1-Grid, MUI.

---

## Files and responsibilities

- `frontend/src/shared/components/f1-grid/types/grid.types.ts`: add maximum and valid-length properties to the declarative format type.
- `frontend/src/shared/components/f1-grid/editing/inputFormat.ts`: cap digits, preserve the current grouping behavior, and expose reusable length validation rules.
- `frontend/src/shared/components/f1-grid/validation/GridValidation.ts`: validate non-empty configured values using digit counts, independent of separators.
- `frontend/src/pages/co/master/customers/components/CustomerGrid.tsx`: configure approved max and valid lengths for customer business/corporate numbers, postal code, telephone, and fax.
- `frontend/tests/customer-number-input.test.ts`: test generic digit caps, phone prefix caps, and input-format length rules.
- `frontend/tests/f1-grid-input-format-validation.test.ts`: test shared row validation for exact and prefix-dependent lengths.
- `frontend/tests/f1-grid-input-sanitizer.test.tsx`: extend existing interaction coverage to verify caps in inline edit, row form, and paste.
- `frontend/tests/page-search-area-detail.test.tsx`: verify maximum digit limits apply to detailed search while partial queries remain allowed.
- `frontend/tests/customer-management-page.test.tsx`: assert the customer column format and digit-length configuration.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`: document max length and save-time validation.
- `docs/directions/20261022/20261022_008_거래처_관리_페이지_작업지시서.md`: state max caps and save validation for customer fields.
- `docs/plan/20261022/20261022_008_거래처_관리_페이지_계획서.md`: record shared format length integration and focused verification.
- `docs/spec/20261022/20261022_008_거래처_관리_페이지_상세사양서.md`: record per-field digit rules and compatibility policy.
- `docs/result/20261022/customer-management/20261022_008_거래처_관리_페이지_결과.md`: document the follow-up change and test evidence.

## Task 1: Extend the shared input format with digit caps

**Files:**
- Modify: `frontend/src/shared/components/f1-grid/types/grid.types.ts`
- Modify: `frontend/src/shared/components/f1-grid/editing/inputFormat.ts`
- Test: `frontend/tests/customer-number-input.test.ts`
- Test: `frontend/tests/f1-grid-input-sanitizer.test.tsx`
- Test: `frontend/tests/page-search-area-detail.test.tsx`

- [ ] **Step 1: Add failing cap tests**

Add tests for generic and phone-specific caps:

```ts
expect(
  formatF1GridInput('123456789012', {
    type: 'digits',
    groupSizes: [3, 2],
    maxDigits: 10,
  }),
).toBe('123-45-67890');
expect(
  formatF1GridInput('021234567890', {
    type: 'korean-phone',
    maxDigits: 11,
  }),
).toBe('02-1234-5678');
expect(
  formatF1GridInput('010123456789', {
    type: 'korean-phone',
    maxDigits: 11,
  }),
).toBe('010-1234-5678');
expect(
  formatF1GridInput('123456789012', {
    type: 'digits',
    groupSizes: [3, 2],
  }),
).toBe('123-45-6789012');
```

The final case proves formats without `maxDigits` keep their prior uncapped behavior. Add one partial-input test proving caps do not pad or reject incomplete values.

Add boundary tests before changing the formatter: a 12-digit value in inline editing, a row form, TSV paste, and detailed search with `maxDigits: 10` must keep only the first 10 digits. In detailed search, also assert that `1234` remains a valid partial query and is formatted as `123-4`.

- [ ] **Step 2: Run tests and confirm the cap cases fail**

Run from `frontend`:

```powershell
npm run test -- tests/customer-number-input.test.ts tests/f1-grid-input-sanitizer.test.tsx tests/page-search-area-detail.test.tsx
```

Expected: the new cap cases FAIL because the current format type and formatter do not accept or apply `maxDigits`.

- [ ] **Step 3: Add length metadata and cap digit input**

Extend the type:

```ts
export type F1GridInputFormat =
  | {
      type: 'digits';
      groupSizes?: number[];
      separator?: string;
      maxDigits?: number;
      validDigitCounts?: number[];
    }
  | { type: 'korean-phone'; maxDigits?: number };
```

For `digits`, slice the digit-only string to `maxDigits` before formatting. For `korean-phone`, cap at `Math.min(maxDigits ?? 10, 10)` when the digits start with `02`, otherwise cap at `Math.min(maxDigits ?? 11, 11)`. The already-shared normalizer is wired to inline editing, row forms, TSV paste, and detailed-search text fields, so each surface must apply the same cap. Preserve all current behavior for formats that have no cap configured, except the phone preset's standard prefix-dependent maximum. Do not change `mapF1GridInputSelection`; verify it still places the caret at the last retained digit when input is capped.

- [ ] **Step 4: Re-run formatter tests**

Run from `frontend`:

```powershell
npm run test -- tests/customer-number-input.test.ts tests/f1-grid-input-sanitizer.test.tsx tests/page-search-area-detail.test.tsx
```

Expected: all formatter, sanitizer, input-cap, and partial-search tests PASS.

## Task 2: Validate completed digit lengths through F1-Grid

**Files:**
- Modify: `frontend/src/shared/components/f1-grid/editing/inputFormat.ts`
- Modify: `frontend/src/shared/components/f1-grid/validation/GridValidation.ts`
- Create: `frontend/tests/f1-grid-input-format-validation.test.ts`

- [ ] **Step 1: Add failing row-validation tests**

Use a row with optional text properties and test:

```ts
expect(validateGridRow({ value: '123-45-67890' }, businessColumns)).toEqual({});
expect(validateGridRow({ value: '' }, businessColumns)).toEqual({});
expect(validateGridRow({ value: '123-45-6789' }, businessColumns)).toEqual({
  value: '사업자번호는 10자리여야 합니다.',
});
expect(validateGridRow({ value: '123-45-678901' }, businessColumns)).toEqual({
  value: '사업자번호는 10자리여야 합니다.',
});
```

Also test a `korean-phone` column: 9/10 digits starting `02` and 10/11 digits with other prefixes pass; 8 digits starting `02`, 11 digits starting `02`, and 9 digits with other prefixes return a field error.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run from `frontend`: `npm run test -- tests/f1-grid-input-format-validation.test.ts`

Expected: FAIL because `validateGridRow` currently has no input-format length validation.

- [ ] **Step 3: Add shared length validation**

Add an exported helper in `editing/inputFormat.ts` that returns whether a non-empty value's digit count is valid for its configured format. For `digits`, validate only when `validDigitCounts` is present. For `korean-phone`, accept 9 or 10 digits for `02` and 10 or 11 digits otherwise. In `GridValidation.ts`, after required/empty handling and before generic numeric/custom validation, skip format validation for empty optional values and report:

```ts
`${column.headerName}은(는) ${expectedLengths}자리여야 합니다.`
```

For `korean-phone`, use a clear message that includes the accepted `02` and other-prefix lengths. Keep existing custom `column.validate` execution for valid format values.

- [ ] **Step 4: Re-run F1-Grid row validation tests**

Run from `frontend`: `npm run test -- tests/f1-grid-input-format-validation.test.ts`

Expected: all new exact-length, phone-prefix, empty, and valid-value cases PASS.

## Task 3: Configure customer fields and update requirements documentation

**Files:**
- Modify: `frontend/src/pages/co/master/customers/components/CustomerGrid.tsx`
- Modify: `frontend/tests/customer-management-page.test.tsx`
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Modify: `docs/directions/20261022/20261022_008_거래처_관리_페이지_작업지시서.md`
- Modify: `docs/plan/20261022/20261022_008_거래처_관리_페이지_계획서.md`
- Modify: `docs/spec/20261022/20261022_008_거래처_관리_페이지_상세사양서.md`
- Modify: `docs/result/20261022/customer-management/20261022_008_거래처_관리_페이지_결과.md`

- [ ] **Step 1: Add failing customer configuration assertions**

Assert the customer column options are:

```ts
businessNo: { type: 'digits', groupSizes: [3, 2], maxDigits: 10, validDigitCounts: [10] }
juridNo: { type: 'digits', groupSizes: [6], maxDigits: 13, validDigitCounts: [13] }
postCode: { type: 'digits', maxDigits: 5, validDigitCounts: [5] }
telephoneNo: { type: 'korean-phone', maxDigits: 11 }
facsimileNo: { type: 'korean-phone', maxDigits: 11 }
```

- [ ] **Step 2: Run the focused customer test and confirm it fails**

Run from `frontend`: `npm run test -- tests/customer-management-page.test.tsx`

Expected: FAIL because current customer columns do not specify the digit caps or valid lengths.

- [ ] **Step 3: Set customer limits and update the user-facing requirements**

Add the configured lengths to the five customer columns. Update the work instruction, plan, and detailed specification to say that all five fields are optional, input is capped by digit count, and non-empty values must meet their configured valid lengths on grid save. State that unmodified legacy values are included in save validation. Document exact phone rules (`02`: 9/10; other prefixes: 10/11), and that detailed search permits partial values while enforcing maximum input digits. Update F1-Grid documentation with examples for `maxDigits` and `validDigitCounts`. Update the result document only after verification, describing the implementation, strict legacy-value behavior, and actual test counts.

- [ ] **Step 4: Re-run customer configuration tests**

Run from `frontend`: `npm run test -- tests/customer-management-page.test.tsx`

Expected: all customer page tests PASS, including the configured length assertions.

## Task 4: Run focused regressions and final checks

**Files:** All files listed above.

- [ ] **Step 1: Run the complete focused regression set**

Run from `frontend`:

```powershell
npm run test -- tests/customer-number-input.test.ts tests/f1-grid-input-format-validation.test.ts tests/f1-grid-input-sanitizer.test.tsx tests/customer-management-page.test.tsx tests/page-search-fields.test.ts tests/page-search-area-detail.test.tsx
```

Expected: all selected tests PASS, including exact business/corporate/postal lengths, prefix-specific phone lengths, input caps, partial search values, and empty optional values.

- [ ] **Step 2: Run the frontend build**

Run from `frontend`: `npm run build`

Expected: TypeScript compilation and Vite production build exit successfully. Existing chunk-size warnings may remain.

- [ ] **Step 3: Check whitespace errors and preserve the branch**

Run from the repository root: `git diff --check`

Expected: exit code 0 with no whitespace errors. Preserve unrelated changes in the shared worktree. Do not commit, merge, push, or discard changes.
