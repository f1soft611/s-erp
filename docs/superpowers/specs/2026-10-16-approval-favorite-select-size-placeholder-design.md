# Approval Favorite Select Size and Placeholder Design

## Context

The favorite approval-line selector in the approval settings dialog should
match the adjacent `결재선 사용자 선택` control. Its unselected display text
also differs from the requested `자주 쓰는 결재선 선택`.

## Design

Keep the existing row layout and button sizing. Adjust only the favorite
selector's local outlined-input height to 38px, matching the 38px minimum
height of the adjacent `UserSelectEditor`. Keep the `설정` button at its current
default size, which matches the adjacent `결재 추가` and `합의 추가` buttons.
Do not resize those buttons or change other controls.

Change the unselected menu item's display text to `자주 쓰는 결재선 선택`.
Keep the select's accessible name `자주 쓰는 결재선`, and retain all existing
selection, loading, manager behavior, and vertical centering.

## Verification

- Add or update approval-settings tests to verify the new unselected text,
  selector height styling, and unchanged settings button size.
- Run the approval-settings tests and frontend build.
- Check the dialog in the available browser session if it can reach the
  authenticated screen; otherwise document that limitation without claiming
  visual verification.
- Update the existing approval-line favorites result report.

## Scope

Only the selector's size and default display text, directly related tests, and
the relevant dated specification and result documentation are in scope.
