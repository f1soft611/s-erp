# F1-Grid Excel Export Cell Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export F1-Grid values as type-appropriate Excel cells while preserving current export scope, display formatting, and safe fallbacks.

**Architecture:** Keep the existing ExcelJS exporter and download path. Convert raw cell values based on `F1GridColumn.type`, share date validation with existing grid display behavior, and apply Excel number formats without replacing typed cell values.

**Tech Stack:** React, TypeScript, ExcelJS, Day.js, Vitest, Playwright/browser.

---

## File map

- Create `docs/directions/20261021/20261021_004_F1Grid_엑셀_타입별_내보내기_작업지시서.md` as the approved task contract.
- Create `docs/plan/20261021/20261021_004_F1Grid_엑셀_타입별_내보내기_계획서.md` for project-level sequencing and validation.
- Create `docs/spec/20261021/20261021_004_F1Grid_엑셀_타입별_내보내기_상세사양서.md` for exact value and format behavior before implementation.
- Create `frontend/tests/f1-grid-excel-export.test.ts` to inspect generated `.xlsx` workbooks using ExcelJS.
- Modify `frontend/src/shared/components/f1-grid/utils/grid.utils.ts` to expose one validated date conversion shared with display formatting and export, and accept unknown raw display values without casts.
- Modify `frontend/src/shared/components/f1-grid/export/GridExcelExport.ts` to add type-specific values and cell formats.
- Modify `frontend/src/pages/f1-grid-docs/F1-GRID.md` without disturbing existing worktree edits.
- Create `docs/result/20261021/f1-grid-excel-export-types/result.md` and a screenshot under `docs/result/20261021/f1-grid-excel-export-types/screenshots/`.

## Task 1: Specify the export contract

**Files:**
- Create: `docs/spec/20261021/20261021_004_F1Grid_엑셀_타입별_내보내기_상세사양서.md`

- [ ] **Step 1: Record the approved cell mapping**

Document numeric cells for `number`/`decimal`/`currency`, date cells for `date`/`datetime`/`time`, Boolean cells for `checkbox`, numeric values when present for `rownumber`, and current display text for other types.

- [ ] **Step 2: Record formatting and fallback rules**

Specify that `decimalPlaces`, explicit currency display format, and supported date masks affect Excel `numFmt` while cell values remain typed. Empty values are blank; malformed non-empty typed values are preserved as original text. Date-only strings retain their represented calendar date independent of timezone.

- [ ] **Step 3: Record test and scope boundaries**

List actual `.xlsx` read-back tests, targeted frontend tests/build, F1-GRID documentation, screenshot/result report, and exclusion of backend/API/DB changes.

## Task 2: Add failing workbook export tests

**Files:**
- Create: `frontend/tests/f1-grid-excel-export.test.ts`
- Test: `frontend/src/shared/components/f1-grid/export/GridExcelExport.ts`

- [ ] **Step 1: Add an ExcelJS workbook capture helper**

Call `exportGridRowsToExcel` with a small set of columns and rows; mock `URL.createObjectURL` and the anchor click; retain the created `Blob`; load `await blob.arrayBuffer()` into a new ExcelJS workbook. Restore every mocked global after each test.

```ts
import ExcelJS from 'exceljs';
import { vi } from 'vitest';
import { exportGridRowsToExcel } from '../src/shared/components/f1-grid/export/GridExcelExport';
import type { F1GridColumn } from '../src/shared/components/f1-grid/types/grid.types';

async function readExportedWorkbook<T extends object>(
  columns: F1GridColumn<T>[],
  rows: T[],
): Promise<ExcelJS.Workbook> {
  let exportedBlob: Blob | undefined;
  const originalCreateObjectURL = Object.getOwnPropertyDescriptor(
    URL,
    'createObjectURL',
  );
  const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(
    URL,
    'revokeObjectURL',
  );
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: (blob: Blob) => {
      exportedBlob = blob;
      return 'blob:export-test';
    },
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: () => {},
  });
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {});

  try {
    await exportGridRowsToExcel(columns, rows, 'export-test');
    if (!exportedBlob) throw new Error('Excel export did not create a Blob.');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await exportedBlob.arrayBuffer());
    return workbook;
  } finally {
    click.mockRestore();
    if (originalCreateObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', originalCreateObjectURL);
    } else {
      Reflect.deleteProperty(URL, 'createObjectURL');
    }
    if (originalRevokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', originalRevokeObjectURL);
    } else {
      Reflect.deleteProperty(URL, 'revokeObjectURL');
    }
  }
}
```

- [ ] **Step 2: Assert typed values and fallback cases**

Use a single fixture with numeric, date, datetime, time, checkbox, rownumber, select, null, invalid numeric/date/time/checkbox values. Assert reloaded numeric/rownumber cells are numbers, date/datetime cells are `Date` values, time is a numeric Excel day fraction, checkbox is boolean, select remains its display label, blank is empty, and invalid values remain text.

```ts
expect(sheet.getCell('A2').value).toBe(1234.5);
expect(sheet.getCell('B2').value).toBeInstanceOf(Date);
expect(sheet.getCell('C2').value).toBeInstanceOf(Date);
expect(sheet.getCell('D2').value).toBeCloseTo((9 * 60 + 21) / (24 * 60));
expect(sheet.getCell('E2').value).toBe(true);
expect(sheet.getCell('F2').value).toBe('Operating');
expect(sheet.getCell('G2').value).toBeNull();
expect(sheet.getCell('H2').value).toBe('not-a-number');
expect(sheet.getCell('I2').value).toBe('2026-02-29');
expect(sheet.getCell('J2').value).toBe(7);
expect(sheet.getCell('K2').value).toBe('25:75');
expect(sheet.getCell('L2').value).toBe('unknown');
```

- [ ] **Step 3: Assert Excel display formats**

Check that explicit currency and `decimalPlaces` produce the expected numeric number format, `date.format` produces an Excel-compatible date number format, and typed cells retain their data types after formatting.

- [ ] **Step 4: Run the new test and confirm it fails**

Run from `frontend`: `npm run test -- tests/f1-grid-excel-export.test.ts`.
Expected: FAIL because the current exporter writes display strings for all cell types.

## Task 3: Share validated date conversion

**Files:**
- Modify: `frontend/src/shared/components/f1-grid/utils/grid.utils.ts`
- Test: `frontend/tests/f1-grid-date-format.test.tsx`
- Test: `frontend/tests/f1-grid-excel-export.test.ts`

- [ ] **Step 1: Add date parser edge-case coverage**

Cover ISO date strings, timestamps with offsets, compact `yyyymmdd`, valid `Date` objects, empty values, and impossible calendar dates. Date-only conversion must retain year/month/day rather than offset-shifting the date.

- [ ] **Step 2: Extract parsing from `formatDateValue`**

Create one exported helper that accepts the currently supported date value shapes, validates the actual calendar date, and returns a local-midnight `Date` for a valid date-only value. Return no date for invalid or empty input; callers distinguish empty from invalid before fallback. Update `formatDateValue` to use the same helper and preserve its existing output contract.

```ts
export function getGridDateValue(value: unknown): Date | undefined {
  if (value instanceof Date) {
    if (!dayjs(value).isValid()) return undefined;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (typeof value !== 'string') return undefined;

  const match = value.match(/^(\d{4})-?(\d{2})-?(\d{2})(?:$|[T ])/);
  if (!match) return undefined;
  const dateText = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = dayjs(dateText);
  if (!parsed.isValid() || parsed.format('YYYY-MM-DD') !== dateText) {
    return undefined;
  }
  return new Date(parsed.year(), parsed.month(), parsed.date());
}
```

Change `getCellDisplayValue` to accept `value: unknown`; its implementation already handles unknown runtime values and this removes the exporter's existing generic cast without changing display behavior.

- [ ] **Step 3: Run date tests**

Run from `frontend`: `npm run test -- tests/f1-grid-date-format.test.tsx`.
Expected: PASS with existing visible date behavior unchanged.

## Task 4: Implement typed Excel cells and formats

**Files:**
- Modify: `frontend/src/shared/components/f1-grid/export/GridExcelExport.ts`
- Test: `frontend/tests/f1-grid-excel-export.test.ts`

- [ ] **Step 1: Add safe raw-value converters**

Add focused private helpers in `GridExcelExport.ts`. Numeric conversion accepts finite numbers and well-formed decimal strings, with invalid non-empty input returned as its original string. Date conversion uses the shared parser. Datetime accepts valid `Date` values or parseable date-time strings. Time accepts valid `HH:mm` and `HH:mm:ss` strings and becomes an Excel day fraction. Checkbox conversion accepts native booleans, numeric `0`/`1`, and recognized true/false strings; unrecognized values remain text.

```ts
type ExportCellValue = string | number | boolean | Date | null;
type ExportCell = { value: ExportCellValue; numFmt?: string };

const DECIMAL_VALUE_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

function getNumberOrText(value: unknown): number | string {
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  if (typeof value === 'string' && DECIMAL_VALUE_PATTERN.test(value)) {
    const number = Number(value);
    return Number.isFinite(number) ? number : value;
  }
  return String(value);
}

function getDateTimeValue(value: unknown): Date | undefined {
  if (!(value instanceof Date) && typeof value !== 'string') return undefined;
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function getTimeValue(value: unknown): { value: number; numFmt: string } | undefined {
  if (typeof value !== 'string') return undefined;
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!match) return undefined;
  const seconds =
    Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] ?? 0);
  return {
    value: seconds / 86400,
    numFmt: match[3] ? 'hh:mm:ss' : 'hh:mm',
  };
}

function getBooleanOrText(value: unknown): boolean | string {
  if (typeof value === 'boolean') return value;
  if (value === 1) return true;
  if (value === 0) return false;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'y', 'yes', '1', 'on'].includes(normalized)) return true;
    if (['false', 'n', 'no', '0', 'off'].includes(normalized)) return false;
  }
  return String(value);
}

function getTypedExcelCell<T extends object>(
  column: F1GridColumn<T>,
  rawValue: unknown,
): ExportCell {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return { value: null };
  }
  switch (column.type) {
    case 'number':
    case 'decimal':
    case 'currency':
      return {
        value: getNumberOrText(rawValue),
        numFmt: getNumericFormat(column),
      };
    case 'date': {
      const date = getGridDateValue(rawValue);
      return date
        ? { value: date, numFmt: getExcelDateFormat(column.format) }
        : { value: String(rawValue) };
    }
    case 'datetime': {
      const date = getDateTimeValue(rawValue);
      return date
        ? { value: date, numFmt: 'yyyy-mm-dd hh:mm:ss' }
        : { value: String(rawValue) };
    }
    case 'time': {
      const time = getTimeValue(rawValue);
      return time ?? { value: String(rawValue) };
    }
    case 'checkbox':
      return { value: getBooleanOrText(rawValue) };
    case 'rownumber':
      return { value: getNumberOrText(rawValue), numFmt: '0' };
    default:
      return { value: getCellDisplayValue(column, rawValue) };
  }
}
```

- [ ] **Step 2: Add Excel number-format helpers**

Build number format strings from explicit `format` and `decimalPlaces` while preserving grid behavior: grouped numbers, exact minimum digits when `decimalPlaces` is supplied, a KRW currency format only when the column's display format is `currency` (zero decimal places by default), and up to three optional decimal places for non-currency values when not specified. Translate the documented date tokens into Excel-compatible date formats and quote literal text.

```ts
function getNumericFormat<T extends object>(
  column: Pick<F1GridColumn<T>, 'format' | 'decimalPlaces'>,
): string {
  const decimalPlaces =
    column.decimalPlaces !== undefined &&
    Number.isInteger(column.decimalPlaces)
      ? Math.max(0, column.decimalPlaces)
      : undefined;
  const digits =
    decimalPlaces === undefined
      ? column.format === 'currency'
        ? ''
        : '###'
      : '0'.repeat(decimalPlaces);
  const numberFormat = digits ? `#,##0.${digits}` : '#,##0';
  return column.format === 'currency'
    ? `"₩"${numberFormat}`
    : numberFormat;
}

function getExcelDateFormat(format?: string): string {
  const source = format || 'yyyy-mm-dd';
  const tokens = source.match(/\[[^\]]*\]|yyyy|yy|mm|m|dd|d/gi) ?? [];
  let result = '';
  let cursor = 0;
  for (const token of tokens) {
    const index = source.indexOf(token, cursor);
    const literal = source.slice(cursor, index);
    if (literal) result += `"${literal.replace(/"/g, '""')}"`;
    result += token.startsWith('[')
      ? `"${token.slice(1, -1).replace(/"/g, '""')}"`
      : token.toLowerCase();
    cursor = index + token.length;
  }
  const trailingLiteral = source.slice(cursor);
  if (trailingLiteral) {
    result += `"${trailingLiteral.replace(/"/g, '""')}"`;
  }
  return result || 'yyyy-mm-dd';
}
```

- [ ] **Step 3: Write type-aware cell values**

Keep current column ordering, headers, row order, `getValue` lookup, and fallback to `getCellDisplayValue` for untyped/text-like columns. Set number/date/time/Boolean values directly on ExcelJS cells and assign `numFmt` without converting those values back to text. Keep `null`, `undefined`, and `''` blank; preserve non-empty invalid input as text.

```ts
rows.forEach((row) => {
  const excelRow = worksheet.addRow([]);
  columns.forEach((column, columnIndex) => {
    const rawValue = column.getValue?.(row) ?? row[column.field];
    const { value, numFmt } = getTypedExcelCell(column, rawValue);
    const cell = excelRow.getCell(columnIndex + 1);
    cell.value = value;
    if (numFmt) cell.numFmt = numFmt;
  });
});
```

- [ ] **Step 4: Run focused export and regression tests**

Run from `frontend`: `npm run test -- tests/f1-grid-excel-export.test.ts tests/f1-grid-date-format.test.tsx`.
Expected: PASS, including typed workbook read-back and unchanged date display behavior. Do not use the known-failing broad `f1-grid.test.tsx` as a gate; record its baseline failures in the result report.

## Task 5: Update F1-GRID documentation

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Test: `frontend/tests/f1-grid-docs.test.tsx`

- [ ] **Step 1: Document the export type mapping**

Add the approved mapping, formatting behavior, invalid-value fallback, and unchanged visible-row/column scope to the existing Excel Export section. Preserve the existing uncommitted archive documentation edits.

- [ ] **Step 2: Run the documentation regression test**

Run from `frontend`: `npm run test -- tests/f1-grid-docs.test.tsx`.
Expected: PASS.

## Task 6: Verify browser surface, build, and results

**Files:**
- Create: `docs/result/20261021/f1-grid-excel-export-types/result.md`
- Create: `docs/result/20261021/f1-grid-excel-export-types/screenshots/f1-grid-export.png`

- [ ] **Step 1: Run the related test set**

Run from `frontend`: `npm run test -- tests/f1-grid-excel-export.test.ts tests/f1-grid-date-format.test.tsx tests/f1-grid-docs.test.tsx`.
Expected: all selected test files pass. The unrelated known baseline failures in `f1-grid.test.tsx` and `f1-grid-context-menu.test.tsx` are reported but not modified.

- [ ] **Step 2: Run the frontend build**

Run from `frontend`: `npm run build`.
Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 3: Capture the existing F1-Grid export surface**

Use the current app on `http://127.0.0.1:4173`, verify the browser is showing the S-ERP app, navigate to an existing F1-Grid surface with Excel export enabled, and save a screenshot of the grid/export menu. Do not stop a pre-existing shared dev server.

- [ ] **Step 4: Record verified results**

Write `result.md` with the user-visible change, root cause, file scope, tested cell-type/format cases, exact test/build outcomes, and screenshot path. State that there were no backend/API/DB changes.

## Self-review checklist

- Every approved type mapping, display format, empty/invalid fallback, and date timezone rule has a test and implementation task.
- Export continues to use the existing visible row/column order and download path.
- Date parser is shared with the current display implementation rather than duplicated.
- Existing worktree edits in `F1-GRID.md` are preserved.
- Baseline failures are recorded accurately and are not silently attributed to the export change.
