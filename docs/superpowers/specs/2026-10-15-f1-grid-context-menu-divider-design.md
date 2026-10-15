# F1-Grid Context Menu Divider Design

## Problem

The F1-Grid context menu always renders a divider before the filter/sort clear
actions and another divider before the reset action. When both
`disableFiltering` and `disableSorting` hide those actions, the two dividers
remain adjacent and appear as a doubled separator.

## Approved behavior

- Keep the divider before the filter/sort action group only while at least one
  of its actions is visible.
- Keep the divider before `설정을 기본값으로 복원`.
- When both clear actions are hidden, render only the divider before the reset
  action; do not leave an empty group or duplicate line.
- When either or both clear actions are visible, preserve the existing menu
  order, enabled/disabled state, and separators.

## Implementation

Use the existing `disableFiltering` and `disableSorting` props to conditionally
render the divider preceding the clear-action group. Do not normalize or
coalesce dividers elsewhere in the menu, since other separators delimit
independent action groups.

Add regression coverage to the F1-Grid context-menu tests for both clear actions
hidden and for a clear action still visible. Keep the current menu action and
separator behavior unchanged in all other cases.

## Documentation and verification

- Update the F1-Grid context-menu description to state that the clear-action
  group divider is omitted when both actions are hidden.
- Record the reproduction condition, cause, fix, and regression verification in
  the dated result documentation.
- Run the focused context-menu test and verify the rendered menu in a browser.
