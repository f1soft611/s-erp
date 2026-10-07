# Document approval short-name visibility

## Goal

Keep approval and agreement participant names of three or four characters fully visible in the document composer while preserving ellipsis for longer names.

## Approved behavior

- Approval participant cells reserve no bottom-row space for the remove button, which is already rendered in the position row.
- Set the approval grid's minimum slot width to 88px so the name row has room for a four-character Korean name beside its sequence badge.
- Remove the approval participant name's arbitrary `3em` maximum width. Names longer than the available cell space continue to use a single-line ellipsis.
- Increase the agreement participant name width limit to `4em`, so names up to four Korean characters fit while longer names retain the existing single-line ellipsis.
- Preserve full names in the existing `title` and accessible participant labels.
- The responsive approval grid may show fewer slots per row on narrow screens. It must continue to wrap slots without causing page-level horizontal overflow.

## Scope

- Update the document approval field component and focused document composer tests.
- Update the dated direction, plan, and specification before implementation, then append verification and screenshot evidence to the existing result report.
- Re-capture the composer at 375px, 768px, and 1280px with identifying names blurred.
- No API, backend, or database changes.

## Verification

- Test that three- and four-character approval and agreement names are not ellipsized, while longer names retain truncation and accessible full names.
- Run focused document composer tests, frontend lint for changed files, and frontend build.
- Verify responsive wrapping and absence of page-level horizontal overflow at 375px, 768px, and 1280px.
