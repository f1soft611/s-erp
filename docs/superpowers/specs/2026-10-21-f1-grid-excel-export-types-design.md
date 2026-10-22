# F1-Grid Excel Export Cell Types Design

> Follow-up amendment: `type: 'date'` is now exported as Grid-formatted text, and Excel header/body alignment follows the Grid column alignment settings. See the [date text export design](./2026-10-21-f1-grid-date-export-text-design.md) for the current contract.

## Context

F1-Grid already creates `.xlsx` files with ExcelJS and exports the visible columns and rows. The current exporter sends every cell through `getCellDisplayValue`, so typed values such as numbers and dates become text. The goal is to retain the existing export scope and download flow while writing type-aware Excel cells.

## Decisions

- Keep the current `GridExcelExport.ts` entry point, ExcelJS dependency, visible column/row selection, and download behavior.
- Write values according to `F1GridColumn.type`:
  - `number`, `decimal`, and `currency`: finite numeric Excel cells.
  - `date`: Excel date cells.
  - `datetime`: Excel date-and-time cells.
  - `time`: Excel time cells.
  - `checkbox`: Boolean cells.
  - `rownumber`: numeric cells when a row-number value is available.
  - Other types: preserve the existing display-text behavior, including option labels for select-like columns.
- Preserve configured display formatting in Excel: numeric grouping/precision and currency format, plus the supported date format mask. The value remains numeric/date typed, so Excel calculations and date operations continue to work.
- Leave `null`, `undefined`, and empty-string values blank. If a non-empty typed value cannot be converted safely, export its original text rather than silently dropping or coercing it.
- For date-only strings, use the calendar date represented by the string; do not allow timezone conversion to shift the date. Use the date validation contract already present in the shared grid utilities.
- Do not change the exported rows/columns, user-facing menu, backend/API behavior, or database.

## Implementation boundary

Type conversion and Excel number-format assignment belong in the existing Excel export module. The exporter should continue to retrieve each value from `column.getValue` or the row field and only then apply type-aware conversion. It should not use rendered React content or change the grid's source row data.

Date display masks supported by F1-Grid should be converted to Excel-compatible number formats. Unsupported or invalid values should retain the safe fallback behavior defined above. The export implementation must not alter the existing on-screen rendering, editing, sorting, filtering, or clipboard contracts.

## Validation

- Add focused tests that create an `.xlsx`, read it back with ExcelJS, and verify cell values/types and number formats for numeric, date, datetime, time, checkbox, text, blank, and invalid-value cases.
- Verify the date-only timezone boundary behavior and the supported date format masks.
- Run the focused export and F1-Grid tests, then the frontend build.
- Update the F1-Grid guide and create the dated work instruction, implementation plan, detailed specification, and result document in their required project locations.
- Capture the F1-Grid export surface in the dated result folder to satisfy the project result-documentation convention, even though this change does not alter rendered UI.
