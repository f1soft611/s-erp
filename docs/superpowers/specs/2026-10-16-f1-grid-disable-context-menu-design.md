# F1-Grid Context Menu Disable Design

## Problem

F1-Grid supports per-action context-menu options but has no option to turn off
the entire body context menu. Both F1Grid and F1Tree use the shared F1Grid menu.

## Approved behavior

- Add `disableContextMenu?: boolean` to `F1GridProps`; its default is `false`.
- The option applies to body right-click menus in both F1Grid and F1Tree.
- When enabled, neither the F1-Grid menu nor the browser's native right-click
  menu is shown.
- Preserve the existing right-click target row/cell selection behavior.
- If the option becomes enabled while the F1-Grid menu is open, close that menu.
- Do not change the header's sort/filter/pin/hide menu behavior.
- Keep existing per-action menu options unchanged.

## Implementation

Use the shared `F1GridProps` contract so F1Tree receives the same option without
introducing a second API. Preserve `openContextMenu`'s event suppression and
target resolution/selection, but do not set the application menu state when the
option is enabled. Close any existing menu when the option changes to enabled.
The default value must preserve all existing behavior.

## Documentation and verification

- Update the public API reference, context-menu playground documentation, and
  `F1-GRID.md`.
- Add regression tests for F1Grid and F1Tree, default behavior, selection
  preservation, and closing a menu when the option is enabled dynamically.
- Run the focused context-menu and F1-Grid documentation tests, then the
  frontend build.
- Verify the enabled and disabled behavior in a browser and save a screenshot
  in the dated result folder.
- Record the reproduction condition, change, and regression checks in the
  dated result documentation.
