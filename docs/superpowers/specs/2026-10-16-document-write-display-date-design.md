# Document Write Display Date Design

## Goal

Use one consistent document date priority across the document-writing feed,
list, detail, and right-side panels:

1. Submission date (`submittedAt`)
2. Last modified date (`updatedAt`)
3. Creation date (`createdAt`)

The first non-empty date is displayed. If all three are absent or empty, keep
the existing empty-date presentation.

## Current behavior

- The list mapping currently uses the requested precedence.
- Feed metadata and the detail-panel author/approval-line metadata use only
  `createdAt`.
- The “놓치지 마세요” panel uses only `submittedDate` and shows a dash when
  there is no submission date.

Consequently, the same document can show different dates, or no date, across
the page.

## Design

Add a small shared document-date selector that accepts the three existing date
fields and returns the selected value and its source label. Use it when mapping
document list records and when formatting feed/detail metadata so all surfaces
apply the same precedence. Keep the existing list/feed metadata layout.

Use the same selected date for the “놓치지 마세요” panel. Its date label
reflects the selected source (`상신일`, `수정일`, or `작성일`) rather than
always claiming the date is a submission date.

No date values are synthesized. Null, undefined, and empty-string fields are
treated as unavailable and fall through to the next source. If all values are
unavailable, preserve the surface's existing empty-date behavior.

## Scope

- Update the document-writing date mapping and the date metadata in
  `DocumentApprovalDetailFeed`.
- Update the date row in `ApprovalNoticePanel`.
- Add focused tests for precedence and for display across list/feed/detail and
  the notice panel.
- Update dated direction, plan, detailed specification, and result documents.
- No backend, API, database, document status, or date formatting changes are
  included.

## Error handling and compatibility

Date selection is a pure presentation operation over existing nullable fields.
Keep existing date formatting, and do not introduce fallback strings that
could make a missing date look like a valid date.

## Verification

- Test all-present and each missing-field combination to verify the exact
  priority order.
- Verify feed cards, list entries, detail-panel metadata, and the “놓치지
  마세요” panel display the same selected date.
- Run the focused document-writing tests and the frontend production build.
- Check the existing browser page at 375px, 768px, and 1280px and record the
  results and screenshots in the dated result folder.
