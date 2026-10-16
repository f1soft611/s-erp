# CommonDialog Extra-Small Size Design

## Context

`CommonDialog` currently supports `md` and `lg` sizes. Its default `md` size is
820px wide and `lg` is 990px wide. Some dialogs need a narrower reusable size
without changing existing callers or the default.

## Decision

Add `xs` to `CommonDialogSize` with a maximum width of 480px. Its rendered width
will follow the existing viewport-safe pattern:

```ts
min(480px, calc(100vw - 48px))
```

The existing `md` and `lg` widths, default `md`, and `fullScreenOnMobile`
behavior remain unchanged. This adds an option for callers but does not change
any existing dialog to use it.

## Alternatives

1. **Add an `xs` enum size (selected):** provides a consistent reusable option
   and keeps the existing size API.
2. **Add a custom width prop:** allows arbitrary widths but expands the API
   beyond the stated need.
3. **Adopt MUI `maxWidth` sizing throughout:** would alter the existing custom
   width scheme and create a larger migration.

## Implementation and Verification

- Extend `CommonDialogSize` and map `xs` to 480px in `CommonDialog`.
- Add a focused `common-dialog` test for the xs paper width while retaining
  assertions for current sizes and layout behavior.
- Update the CommonDialog requirements, implementation plan, work direction,
  and result documentation to record the new option and regression check.
- Run the focused CommonDialog test and the frontend build.
- Check the responsive width rule against the existing dialog behavior on
  narrow viewports.

## Scope

Only the shared dialog size API and directly related tests and documentation
are in scope. No call-site migration, dialog layout change, backend change, or
other sizing customization is included.
