# Approval Favorite Select Size and Placeholder Design

## Context

The favorite approval-line selector in the approval settings dialog is
currently shorter than the adjacent `결재 추가` and `합의 추가` buttons. Its
unselected display text also differs from the requested `자주 쓰는 결재선
선택`.

## Design

Keep the existing row layout and button sizing. Adjust only the favorite
selector's local outlined-input height and vertical content alignment so its
outer height matches the adjacent default-size action buttons. Do not resize
the buttons or change other controls.

Change the unselected menu item's display text to `자주 쓰는 결재선 선택`.
Keep the select's accessible name `자주 쓰는 결재선`, and retain all existing
selection, loading, and manager behavior.

## Verification

- Add or update approval-settings tests to verify the new unselected text and
  selector height styling.
- Run the approval-settings tests and frontend build.
- Check the dialog in the available browser session if it can reach the
  authenticated screen; otherwise document that limitation without claiming
  visual verification.
- Update the existing approval-line favorites result report.

## Scope

Only the selector's size and default display text, directly related tests, and
the relevant dated specification and result documentation are in scope.
