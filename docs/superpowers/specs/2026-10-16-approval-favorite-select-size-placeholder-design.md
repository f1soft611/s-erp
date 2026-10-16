# Approval Favorite Select Size and Placeholder Design

## Context

The favorite approval-line selector in the approval settings dialog should
match the adjacent `결재선 사용자 선택` control. Its unselected display text
also differs from the requested `자주 쓰는 결재선 선택`.

## Design

Keep the existing select, options, and button behavior. Set the favorite
selector row to stretch its children so the 38px select and `설정` button have
the same outer height, matching the adjacent approval-selection row. Keep the
button's existing medium variant and limit the layout change to this row.

Keep the select's 38px minimum height and vertically centered displayed value.
Render the empty prompt `자주 쓰는 결재선 선택` with the same 0.82rem,
600-weight typography as the `UserSelectEditor` input label. Leave selected
template names at their existing typography. Keep the select's accessible name
`자주 쓰는 결재선`, and retain all selection, loading, and manager behavior.

## Verification

- Add or update approval-settings tests to verify the selector row stretch
  alignment, 38px selector height, and empty-prompt typography.
- Run the approval-settings tests and frontend build.
- Check the dialog in the available browser session if it can reach the
  authenticated screen; otherwise document that limitation without claiming
  visual verification.
- Update the related dated task instruction, plan, specification, and existing
  approval-line favorites result report.

## Scope

Only the selector row's dimensions/alignment and prompt typography, directly
related tests, and the relevant dated specification and result documentation
are in scope.
