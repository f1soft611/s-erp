# F1-Tree Checkbox and Leaf Marker Design

## Problem

On a non-root leaf row, the `ㄴ` branch marker is absolutely positioned using
tree depth only. When `treeCheckbox` is enabled, the checkbox occupies the same
horizontal area and the marker overlaps it.

## Design

Keep the existing marker condition (`depth > 0 && !hasChildren`) and preserve
the checkbox, disclosure control, and label positions. Render the marker inside
the existing 32px empty disclosure slot used by leaf rows, rather than
positioning it over the row content. Without `treeCheckbox`, this retains the
marker's current horizontal position; with it, the marker naturally follows
the checkbox into the disclosure slot.

No tree data, selection behavior, side navigation, or backend behavior changes.

## Verification

Add a regression test for a leaf row with `treeCheckbox` enabled that verifies
the marker is rendered in the disclosure slot and separately from the checkbox.
Run the focused F1-Tree test, frontend build and lint, and inspect browser
rendering at 375px, 768px, and 1280px.
