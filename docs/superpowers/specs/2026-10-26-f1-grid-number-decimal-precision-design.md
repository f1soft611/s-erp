# F1-Grid Number Decimal Precision Design

## Goal

Let developers control the displayed fractional digits of F1-Grid numeric columns with the existing `decimalPlaces` column option, and show up to five fractional digits by default.

## Approved behavior

- Reuse `F1GridColumn.decimalPlaces`; do not add a new number-format option.
- For `number` and `decimal` columns without `decimalPlaces`, format values with locale grouping, zero minimum fractional digits, and a maximum of five fractional digits. Trailing zeroes are omitted, and the decimal separator is omitted when there is no fractional part.
- When `decimalPlaces` is explicitly set to a valid non-negative integer, preserve current behavior: use it for both the minimum and maximum fractional digits.
- Preserve the existing KRW currency default of zero fractional digits. An explicit `decimalPlaces` continues to control currency precision.
- Keep Excel numeric formats aligned with on-screen defaults and explicit column precision.
- Do not change editor input limits or raw-value persistence as part of the default display change.

## Alternatives considered

1. Reuse `decimalPlaces` and change only the unspecified numeric display default to five optional digits. This preserves existing explicit precision behavior and is selected.
2. Treat all `decimalPlaces` values as maximum precision and trim trailing zeroes. This changes the existing fixed-precision contract and is not selected.
3. Add a string mask option such as `numberFormat: '###.#####'`. This duplicates the existing numeric precision option and is not selected.

## Implementation scope

- Update numeric display formatting for `number` and `decimal` columns.
- Update Excel number formats so unspecified numeric precision uses up to five optional fractional digits while explicit precision stays fixed.
- Add regression coverage for integer values, optional fractional digits, five-digit rounding, and explicit fixed precision.
- Update the F1-Grid API documentation and dated task, plan, specification, and result documents.

## Validation

- Run the focused F1-Grid formatting and Excel-export tests.
- Run the frontend production build.
- Verify the rendered numeric behavior in the browser at the existing frontend test address and capture the required result screenshot.
