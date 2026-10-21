# F1-Grid date Text Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export `type: 'date'` cells as text matching the Grid's configured date display and synchronize exported header/body alignment with the Grid.

**Architecture:** Reuse `getCellDisplayValue` as the single source for the displayed date string. Carry each column's `headerAlign` and `align` through the existing worksheet writer; use the same defaults as `GridHeader` (center) and `GridCell` (`number`/`rownumber` right, otherwise left). Leave non-date value conversion and all number formats untouched.

**Tech Stack:** React, TypeScript, ExcelJS, Vitest.

---

## Files

- Modify `frontend/src/shared/components/f1-grid/export/GridExcelExport.ts` for date string conversion and Grid header/body alignment.
- Modify `frontend/tests/f1-grid-excel-export.test.ts` for XLSX round-trip value/type and header/body alignment assertions.
- Modify `frontend/src/pages/f1-grid-docs/F1-GRID.md` for the public export contract.
- Create `docs/result/20261021/f1-grid-date-export-text/result.md` referencing the existing screenshot at `docs/result/20261021/f1-grid-excel-export-types/screenshots/f1-grid-excel-export-context-menu.png`.

### Task 1: Export Grid-formatted date text and Grid-aligned cells

**Files:**
- Modify: `frontend/tests/f1-grid-excel-export.test.ts`
- Modify: `frontend/src/shared/components/f1-grid/export/GridExcelExport.ts`

- [ ] **Step 1: Update XLSX assertions to describe the requested contract**

In the existing test, replace the Date-value and date `numFmt` assertions with:

```ts
expect(sheet?.getCell('C2').value).toBe('2026년 10월 20일');
expect(sheet?.getCell('C2').type).toBe(ExcelJS.ValueType.String);
expect(sheet?.getCell('C2').numFmt).toBeUndefined();
expect(sheet?.getCell('A1').alignment?.horizontal).toBe('center');
expect(sheet?.getCell('A2').alignment?.horizontal).toBe('right');
expect(sheet?.getCell('C1').alignment?.horizontal).toBe('right');
expect(sheet?.getCell('C2').alignment?.horizontal).toBe('center');
```

Configure the valid date column with `align: 'center'` and `headerAlign: 'right'`. Add a nullable date column without explicit `align` and verify it remains null and left-aligned. Verify the existing invalid date text is left-aligned by default. Keep the existing `datetime` Date assertion to ensure it remains typed.

- [ ] **Step 2: Run the focused test and confirm it fails before implementation**

Run from `frontend`:

```powershell
npm run test -- tests/f1-grid-excel-export.test.ts
```

Expected: the date value is currently a `Date`, header/body Grid alignments are absent, and the new date text/header/body alignment expectations fail.

- [ ] **Step 3: Store date display text and alignment in the existing export path**

Extend `ExportCell` with an Excel horizontal alignment shape:

```ts
type ExportCell = {
  value: ExportCellValue;
  numFmt?: string;
  alignment?: { horizontal: 'left' | 'center' | 'right' };
};
```

Add a helper returning `column.align ?? (column.type === 'number' || column.type === 'rownumber' ? 'right' : 'left')`. Use it for every body cell, including empty date cells. Replace the `date` switch branch with a string value from `getCellDisplayValue(column, rawValue)` and its computed alignment; do not attach `numFmt`. Set each header cell's alignment to `column.headerAlign ?? 'center'`. Apply the body cell alignment in the existing row writer in addition to its existing `numFmt`.

- [ ] **Step 4: Re-run the focused export test**

Run:

```powershell
npm run test -- tests/f1-grid-excel-export.test.ts
```

Expected: the XLSX round-trip assertions pass; `datetime`, `time`, numeric, Boolean, invalid, and blank values retain their expected behavior.

### Task 2: Update documentation and verify the integrated change

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Create: `docs/result/20261021/f1-grid-date-export-text/result.md`

- [ ] **Step 1: Document date export behavior**

Update the Excel export description to say `type: 'date'` is text matching the Grid `format`, while `datetime` remains an Excel date/time cell. Document that `headerAlign`/`align` and their Grid defaults are applied to Excel headers/body cells. State that date text prioritizes matching the Grid display over Excel date calculations.

- [ ] **Step 2: Run the focused regression suite**

Run from `frontend`:

```powershell
npm run test -- tests/f1-grid-excel-export.test.ts tests/f1-grid-date-format.test.tsx tests/f1-grid-docs.test.tsx
```

Expected: all three test files pass.

- [ ] **Step 3: Run the frontend build**

Run:

```powershell
npm run build
```

Expected: exit code 0; existing bundle-size warnings may remain.

- [ ] **Step 4: Write the result report**

Record the behavior change, the test/build outputs, and any pre-existing unrelated baseline failures. Link the existing Excel export menu screenshot rather than creating a duplicate screenshot for this non-visual cell serialization change.

- [ ] **Step 5: Inspect only the scoped diff**

Run:

```powershell
git diff --check
git status --short
```

Ensure unrelated existing worktree changes, including `DocumentApprovalDetailFeed.tsx`, remain untouched.
