# Customer Number Input Filtering Design

## Goal

Limit editable customer number/contact fields to ASCII digits (`0`-`9`) and the hyphen (`-`). When users type or paste other characters, strip those characters immediately.

## Scope

Apply the same character filter to:

- Customer registration and edit row forms: `businessNo`, `juridNo`, `postCode`, `telephoneNo`, and `facsimileNo`.
- Inline F1-Grid editing of those fields.
- Detailed-search inputs `businessNo` and `juridNo`.

Do not change the database schema or API field types. Keep values as strings so leading zeroes and user-provided hyphens are preserved. Do not insert hyphens, enforce a number-specific format, or impose a length limit.

## Existing Data

Sanitize only when the user changes an input. Existing values should remain unchanged when a form is opened or when another field is edited. This avoids silently rewriting existing records.

## Implementation Shape

Use a small reusable input sanitizer and a per-column F1-Grid input-normalization hook, rather than changing all text fields globally. Invoke it while editing both inline cells and row-form fields. Normalize the two detailed-search values in the controlled search-value change handler. The filter is an input affordance, not a database/API migration or a server-side rewrite.

## Alternatives Considered

1. Use a numeric input type. Rejected because it does not support the required hyphen entry and can coerce values with leading zeroes.
2. Strip invalid characters only from the customer row form. Rejected because inline editing and detailed search would behave differently for the same fields.
3. Add a general filter to every F1-Grid text input. Rejected because it would affect unrelated pages and fields.

## Verification

- Unit-test the sanitizer with digits, hyphens, mixed input, pasted text, and empty input.
- Verify customer row-form and inline editing apply the filter only to the five named fields.
- Verify detailed-search business/corporate number values are filtered as they are entered.
- Verify unrelated text fields and existing values are not modified.
- Run focused customer-management tests and the frontend production build.
