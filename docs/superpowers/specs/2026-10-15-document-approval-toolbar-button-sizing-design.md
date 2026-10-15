# Document Approval Toolbar Button Sizing Design

## Goal

Make approval actions visually consistent in the document feed and detail toolbar while preserving the compact toolbar layout requested by the user.

## Approved behavior

- Approval, rejection, revision-request, submission-cancellation, and approval-cancellation buttons share a `30px` height and the same vertical and horizontal padding.
- Button widths remain content-based; labels are not truncated and button widths are not forced to a fixed value.
- Existing semantic variants and colors remain unchanged: approval is primary contained, rejection and cancellations are error contained, and revision-request is warning outlined.
- The toolbar is shared by feed and detail, so the same size rule applies to both.
- The horizontal gap between the document-kind Chip and vertical divider is the same as the gap between the divider and pin icon. Retain the toolbar Stack's existing `4px` spacing and remove the Divider's extra horizontal margins.
- Do not change toolbar order, icon sizes, Chip dimensions, responsive wrapping, or any other document actions.

## Implementation boundary

Update the action-button styles and divider spacing in `DocumentApprovalDetailFeed.tsx`. Add focused regression assertions to `document-write-page.test.tsx` for consistent action-button height/padding and the divider's absence of extra horizontal margins. Keep the existing toolbar-order and responsive-wrap behavior.

## Validation

- Run the focused toolbar test and the nearby document-write regression tests.
- Run the frontend production build.
- Check `git diff --check`.
- Inspect feed/detail toolbar layout at the required 375px, 768px, and 1280px browser widths when the existing authenticated browser session is available.

## Out of scope

- Fixed-width buttons.
- Changes to toolbar labels, action authorization, action behavior, colors, Chips, pin/menu controls, or API contracts.
