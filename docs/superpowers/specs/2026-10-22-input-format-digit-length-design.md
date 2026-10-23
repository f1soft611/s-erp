# F1-Grid Input Format Digit Length Design

## Goal

Extend the shared F1-Grid `inputFormat` option with configurable digit limits
and row-save length validation, then apply it to customer identifiers and
contact-number fields.

## Context

The current `inputFormat` supports digit grouping and a Korean phone preset, but
does not cap numeric digits or validate the completed length. The project
already routes row-form and grid-save validation through `validateGridRow`.
Customer page save also calls `grid.validate()` before persisting changes.

## Approved behavior

- Maximums count digits only; separators do not count.
- Typing, row-form edits, TSV paste, and detailed search enforce the configured
  maximum digit count and keep the existing automatic formatting behavior.
- Incomplete values are allowed while the user is editing and during partial
  detailed searches.
- On row save, every non-empty configured value must have a valid digit count.
  Empty values remain valid because all of the customer number/contact fields
  are optional.
- The selected strict policy validates every field on save, including a
  pre-existing number not changed in the current edit. Invalid legacy values
  therefore block save until corrected or cleared.
- API and database contracts remain unchanged.

## Customer digit rules

| Field | Input maximum | Valid non-empty digit count | Formatting |
| --- | ---: | --- | --- |
| Business registration number | 10 | 10 | `000-00-00000` |
| Corporate registration number | 13 | 13 | `000000-0000000` |
| Postal code | 5 | 5 | digits only |
| Telephone | prefix-dependent, up to 11 | `02`: 9 or 10; other prefixes: 10 or 11 | Korean phone preset |
| Fax | prefix-dependent, up to 11 | `02`: 9 or 10; other prefixes: 10 or 11 | Korean phone preset |

For the Korean phone preset, input starting with `02` is capped at 10 digits;
other phone input is capped at 11. The existing grouping is retained. No
checksum or prefix-registry validation is added.

## Design

Extend the declarative format configuration with optional digit-count metadata:

```ts
type F1GridInputFormat =
  | {
      type: 'digits';
      groupSizes?: number[];
      separator?: string;
      maxDigits?: number;
      validDigitCounts?: number[];
    }
  | {
      type: 'korean-phone';
      maxDigits?: number;
    };
```

The shared normalizer removes non-digit characters for configured formats,
limits input to `maxDigits`, then formats the retained digits. The Korean phone
preset applies the stricter 10-digit maximum for `02` numbers and 11 digits for
other prefixes. Existing format configurations without length metadata preserve
their current behavior apart from the phone preset's standard cap.

The shared F1-Grid row validator checks `validDigitCounts` for non-empty
`digits` values and the prefix-dependent accepted lengths for `korean-phone`.
It reports the error against the corresponding column so existing form and grid
validation UI can focus and display it. Length validation is skipped for empty
optional values. `maxDigits` is an input cap, not a substitute for save-time
length validation.

The customer columns set the approved maximum/valid lengths. Since
`toPageSearchFields` carries the same metadata, detailed searches also obey
maximum digit counts but do not require complete values.

## Approaches considered

1. **Shared `inputFormat` length metadata plus `validateGridRow` integration
   (selected):** one column declaration controls input caps and save validation
   across grid surfaces; existing error UI is reused.
2. HTML `maxLength` props: does not count digits independently of separators or
   consistently cover TSV paste and save validation.
3. Customer-only save-hook validation: can protect this page but duplicates
   rules and does not make the option reusable in other grids.

## Verification

- Unit tests cover input caps before/after separators, phone prefix-dependent
  caps, full and incomplete values, empty optional values, and allowed lengths.
- F1-Grid row validation tests verify errors for short/long non-empty values and
  no error for valid or empty optional values.
- Component tests verify row-form and grid validation errors, plus capped inline
  entry, TSV paste, and detailed-search input.
- Customer column tests assert all configured digit limits and allowed lengths.
- Run the focused Vitest suite, frontend build, and `git diff --check`.

## Out of scope

- Backend validation or database schema changes.
- Checksum validation, registry verification, or required-field changes.
- Automatic correction of pre-existing values.
- Layout or responsive-design changes.
