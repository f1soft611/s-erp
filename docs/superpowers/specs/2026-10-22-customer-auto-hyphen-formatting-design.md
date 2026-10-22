# Customer auto-hyphen formatting design

## Goal

Automatically insert hyphens while users enter customer identifiers and contact
numbers, using reusable F1-Grid column configuration rather than customer-only
input behavior.

## Root cause

The current `sanitizeInput` column callback only removes characters outside
digits and hyphens. The customer work instruction explicitly said not to force
hyphen positions, so the implementation correctly allowed manually entered
hyphens but did not insert any. The requested behavior is now automatic
formatting.

## User-approved formatting rules

- Business registration number: `000-00-00000`.
- Corporate registration number: `000000-0000000`.
- Telephone and fax: `02-xxx-xxxx` for nine digits starting with `02`,
  `02-xxxx-xxxx` for ten digits starting with `02`, `0xx-xxx-xxxx` for ten
  other digits, and `0xx-xxxx-xxxx` for eleven other digits. Partial input is
  formatted as it is entered; extra digits are retained rather than rejected.
- Postal code: current five-digit form; digits only, without a hyphen.

Formatting is for display/input only. It does not change API or database
contracts, validate checksum/length, or rewrite a stored value before the user
edits it.

## Design

Add an optional declarative `inputFormat` to F1-Grid column metadata. It supports
generic digit grouping (separator and digit-group boundaries) and a Korean phone
format preset for prefix/length-dependent grouping. The customer columns opt in
with the relevant format configuration. Columns without this option retain
their existing behavior.

Use a single shared formatter pipeline wherever a configured text column
accepts user input:

- F1-Grid inline editor
- F1-Grid row form
- F1-Grid TSV paste
- PageSearchArea detailed-search fields derived from column metadata

Keep `sanitizeInput` available for existing consumers. When both
`inputFormat` and `sanitizeInput` are configured, the format configuration
defines the final input representation and permits only the digits relevant to
that format. Do not transform existing values during initial render.

The input handler must preserve a useful caret position when separators are
inserted or removed during editing. Pasted values must receive the same format
as typed values. Search field derivation must carry the format metadata from
the originating column.

## Approaches considered

1. Per-page formatter callbacks: flexible, but every page must implement the
   same cross-surface wiring and formatting rules.
2. Declarative F1-Grid `inputFormat` metadata with a shared formatter: selected
   because it centralizes behavior and keeps each field's configuration
   explicit and reusable.
3. Replace each field with a masking component: offers rich masking but would
   duplicate or bypass grid edit, paste, and search behavior.

## Verification

- Unit tests cover generic group formatting, each customer format, partial
  values, pasted values, and unchanged values without a format option.
- Component tests verify formatting in inline editing, row forms, TSV paste,
  and detailed search.
- Regression tests verify that existing values remain unchanged until edited and
  that unrelated text fields are unaffected.
- Run focused Vitest tests, the frontend build, and `git diff --check`.

## Out of scope

- API, backend, or database changes.
- Checksum validation, fixed-length rejection, or automatic correction of
  legacy values.
- Visual redesign or responsive-layout changes.
