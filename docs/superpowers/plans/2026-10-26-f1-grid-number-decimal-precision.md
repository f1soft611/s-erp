# F1-Grid Number Decimal Precision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reuse the existing `decimalPlaces` column option and show up to five optional fractional digits by default for F1-Grid number and decimal columns.

**Architecture:** Keep formatting in the current grid display formatter and Excel export formatter. An omitted precision uses zero minimum and five maximum fractional digits, while a valid explicit `decimalPlaces` remains fixed precision. Currency defaults, editor input behavior, and stored values remain unchanged.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, ExcelJS, Vite.

---

## File Map

- Modify `frontend/src/shared/components/f1-grid/utils/grid.utils.ts` for the on-screen number formatting default.
- Modify `frontend/src/shared/components/f1-grid/export/GridExcelExport.ts` for the Excel number-format default.
- Modify `frontend/tests/f1-grid-date-format.test.tsx` for screen formatting regression cases.
- Modify `frontend/tests/f1-grid-excel-export.test.ts` for the Excel format regression case.
- Modify `frontend/src/pages/f1-grid-docs/F1-GRID.md`, `frontend/src/pages/f1-grid-docs/data/f1GridApiReference.ts`, and `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts` for public API documentation.
- Create dated task documentation at `docs/directions/20261026/20261026_006_F1Grid_숫자_소수점_자릿수_작업지시서.md`, `docs/plan/20261026/20261026_006_F1Grid_숫자_소수점_자릿수_계획서.md`, `docs/spec/20261026/20261026_006_F1Grid_숫자_소수점_자릿수_상세사양서.md`, and `docs/result/20261026/f1-grid-number-decimal-precision/`.

## Task 1: Lock Screen Precision Behavior With Tests

**Files:**
- Modify: `frontend/tests/f1-grid-date-format.test.tsx`
- Test: `frontend/tests/f1-grid-date-format.test.tsx`

- [x] **Step 1: Add failing default and explicit precision tests**

Add a numeric row type and a `number` column fixture, then assert default optional digits, no decimal separator for integers, five-digit rounding, `decimal` parity, and explicit fixed precision:

```ts
type NumericRow = { id: string; amount: number };
const numberColumn: F1GridColumn<NumericRow> = {
  field: 'amount',
  headerName: 'Amount',
  type: 'number',
};

it('formats number columns with up to five optional fractional digits by default', () => {
  expect(getCellDisplayValue(numberColumn, 1)).toBe('1');
  expect(getCellDisplayValue(numberColumn, 1.2)).toBe('1.2');
  expect(getCellDisplayValue(numberColumn, 1.234567)).toBe('1.23457');
  expect(
    getCellDisplayValue({ ...numberColumn, type: 'decimal' }, 1.2345),
  ).toBe('1.2345');
  expect(
    getCellDisplayValue({ ...numberColumn, decimalPlaces: 2 }, 1.2),
  ).toBe('1.20');
});

it('renders numeric cells with five optional decimal places', () => {
  render(
    <F1Grid
      rowKey="id"
      rows={[
        { id: 'integer', amount: 1 },
        { id: 'fractional', amount: 1.234567 },
      ]}
      columns={[numberColumn]}
    />,
  );

  expect(screen.getByRole('gridcell', { name: '1' })).toBeInTheDocument();
  expect(screen.getByRole('gridcell', { name: '1.23457' })).toBeInTheDocument();
});
```

- [x] **Step 2: Run the test and confirm the default precision assertion fails**

Run from `frontend`:

```powershell
npm run test -- tests/f1-grid-date-format.test.tsx
```

Expected before implementation: the `1.234567` assertion produces the current three-fraction-digit output instead of `1.23457`; the test command exits non-zero.

## Task 2: Update the Screen Display Default

**Files:**
- Modify: `frontend/src/shared/components/f1-grid/utils/grid.utils.ts`
- Test: `frontend/tests/f1-grid-date-format.test.tsx`

- [x] **Step 1: Change the default maximum precision in both number-format branches**

Keep the existing minimum and explicit precision behavior; replace the two `?? 3` defaults with `?? 5`:

```ts
if (resolvedFormat === 'number' || resolvedFormat === 'decimal') {
  return new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: decimalPlaces ?? 0,
    maximumFractionDigits: decimalPlaces ?? 5,
  }).format(numericValue);
}

return new Intl.NumberFormat('ko-KR', {
  minimumFractionDigits: decimalPlaces ?? 0,
  maximumFractionDigits: decimalPlaces ?? 5,
}).format(numericValue);
```

- [x] **Step 2: Re-run screen formatting tests**

Run:

```powershell
npm run test -- tests/f1-grid-date-format.test.tsx
```

Expected: PASS; integer values have no decimal separator, fractional values show up to five digits, and explicitly configured precision remains fixed.

## Task 3: Lock Excel Precision Behavior With Tests

**Files:**
- Modify: `frontend/tests/f1-grid-excel-export.test.ts`
- Test: `frontend/tests/f1-grid-excel-export.test.ts`

- [x] **Step 1: Add a default-precision numeric export fixture**

Add `defaultAmount: number` to `ExportRow`, append a `type: 'number'` column without `decimalPlaces`, set its test value to `1.234567`, and assert the exported cell retains its numeric value and uses the optional five-digit format:

```ts
expect(sheet?.getCell('Q2').value).toBe(1.234567);
expect(sheet?.getCell('Q2').numFmt).toBe('#,##0.#####');
```

Keep existing assertions for `decimalPlaces: 2` (`#,##0.00`) and default KRW (`"₩"#,##0`).

- [x] **Step 2: Run the export test and confirm the new format assertion fails**

Run:

```powershell
npm run test -- tests/f1-grid-excel-export.test.ts
```

Expected before implementation: the default number column still has the current `#,##0.###` format; the test command exits non-zero.

## Task 4: Update the Excel Default and Verify Tests

**Files:**
- Modify: `frontend/src/shared/components/f1-grid/export/GridExcelExport.ts`
- Test: `frontend/tests/f1-grid-excel-export.test.ts`

- [x] **Step 1: Use five optional digits for unspecified non-currency precision**

In `getNumericFormat`, preserve the currency default and explicit zero-placeholder precision. Change only the unspecified non-currency placeholder from `'###'` to `'#####'`:

```ts
const digits =
  decimalPlaces === undefined
    ? column.format === 'currency'
      ? ''
      : '#####'
    : '0'.repeat(decimalPlaces);
const numberFormat = digits ? `#,##0.${digits}` : '#,##0';
```

- [x] **Step 2: Run both focused regression test files**

Run:

```powershell
npm run test -- tests/f1-grid-date-format.test.tsx tests/f1-grid-excel-export.test.ts
```

Expected: PASS; screen formatting and exported numeric masks match the approved precision contract.

## Task 5: Update F1-Grid Documentation and Record Browser Evidence

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Modify: `frontend/src/pages/f1-grid-docs/data/f1GridApiReference.ts`
- Modify: `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`
- Modify: `docs/spec/20261021/20261021_004_F1Grid_엑셀_타입별_내보내기_상세사양서.md`
- Create: `docs/result/20261026/f1-grid-number-decimal-precision/20261026_006_F1Grid_숫자_소수점_자릿수_결과.md`
- Create: `docs/result/20261026/f1-grid-number-decimal-precision/screenshots/number-precision-1280px.png`

- [x] **Step 1: Update the API reference and example**

Document that omitted precision for `number`/`decimal` uses zero-to-five optional digits; explicit `decimalPlaces` is fixed precision. Preserve the `format: 'currency'` zero-digit default. Update the existing Excel export specification from three optional digits to five so it agrees with current behavior.

- [x] **Step 2: Verify the API documentation tests**

Run the focused documentation contract test directly:

```powershell
npx vitest run tests/f1-grid-docs.test.tsx -t "documents the full editing contract including plugins and number format"
```

Expected: PASS; API reference and documentation examples continue to render and expose `decimalPlaces`. Keep this test filtered because the full documentation suite has a known intermittent 5-second timeout in a separate search test.

- [x] **Step 3: Verify a real browser rendering and capture a screenshot**

Open the F1-Grid documentation page on `http://127.0.0.1:4173/f1-grid-docs`, verify the number-format examples render, and save a 1280px screenshot under the result folder. The actual `F1Grid` numeric cell output is asserted in the component regression test. Reuse the already-running S-ERP server; do not stop it.

- [x] **Step 4: Write the result report**

Record the change, affected formatter/export paths, regression coverage, exact test/build outcomes, and browser screenshot path in `docs/result/20261026/f1-grid-number-decimal-precision/20261026_006_F1Grid_숫자_소수점_자릿수_결과.md`.

## Task 6: Final Verification

**Files:**
- Verify: `frontend/src/shared/components/f1-grid/utils/grid.utils.ts`
- Verify: `frontend/src/shared/components/f1-grid/export/GridExcelExport.ts`
- Verify: `frontend/tests/f1-grid-date-format.test.tsx`
- Verify: `frontend/tests/f1-grid-excel-export.test.ts`

- [x] **Step 1: Run focused tests and the frontend build**

Run from `frontend`:

```powershell
npm run test -- tests/f1-grid-date-format.test.tsx tests/f1-grid-excel-export.test.ts
npx vitest run tests/f1-grid-docs.test.tsx -t "documents the full editing contract including plugins and number format"
npm run build
```

Expected: both number-format test files and the focused documentation contract test pass; the TypeScript/Vite production build succeeds. The full frontend suite was also run and its unrelated failures are recorded in the result report.

- [x] **Step 2: Review the final diff for scope and pre-existing changes**

Run:

```powershell
git status --short
git --no-pager diff -- frontend/src/shared/components/f1-grid/utils/grid.utils.ts frontend/src/shared/components/f1-grid/export/GridExcelExport.ts frontend/tests/f1-grid-date-format.test.tsx frontend/tests/f1-grid-excel-export.test.ts
```

Expected: only the planned formatting, tests, and documentation changes are attributable to this task; preserve unrelated pre-existing worktree changes and do not stage them.
