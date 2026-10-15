# Document Approval Toolbar Visual Consistency Design

## Goal

Refine the document approval line and detail/feed toolbar to match the supplied screenshots and the user's follow-up requirements.

## Approved behavior

- For approval-line status seals, use the corresponding approval-line participant border color for both the seal border and fallback status text. Preserve the status-specific dashed/solid border style and existing stamp-image behavior.
- In the shared feed/detail toolbar, approval, rejection, revision-request, submission-cancellation, and approval-cancellation buttons retain the small-button geometry used by the comment registration button: 28px minimum height from the application theme, 4px vertical padding, and 10px horizontal padding.
- Set both approval status and document-kind Chips to 28px high, so their visual height matches those action buttons. Keep the existing natural/content-based widths, labels, colors, variants, and 8px border radius.
- Add 4px of extra space after the document-kind Chip. Together with the existing Stack 4px gap, the total kind-to-divider gap is 8px. Keep the divider-to-pin gap at the existing 4px.
- Keep the toolbar order, action authorization and handlers, responsive wrapping, and API behavior unchanged.

## Implementation boundary

Make a focused frontend change in `DocumentApprovalDetailFeed.tsx`. Add regression assertions in `document-write-page.test.tsx` for seal colors against the enclosing participant border, equal toolbar control heights, and the additional kind-to-divider spacing. Update the dated project specification and result report.

## Validation

- Run focused document-write tests that cover the approval line and shared toolbar.
- Run the frontend production build and `git diff --check`.
- Inspect the relevant rendered view at 375px, 768px, and 1280px when an authenticated document-detail page is available; record any access limitation rather than claiming an unperformed check.

## Out of scope

- Fixed-width toolbar buttons or Chips.
- Global MUI theme changes.
- Changes to approval status semantics, colors outside seal matching, actions, permissions, API contracts, or document content.
