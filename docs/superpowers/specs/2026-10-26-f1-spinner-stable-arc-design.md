# F1 Spinner Stable-Arc Design

## Context

The shared archive browser page showed a 34px MUI indeterminate spinner whose SVG circle kept a 3.6px stroke while its computed dash array and offset changed across short time intervals. This is MUI's default indeterminate animation: it changes the visible arc length as it rotates, so two screenshots taken at different animation phases can look like different spinners even when the component, size, and stroke are unchanged.

The shared `AppLoadingSpinner` is used by ordinary loading indicators and by the F1Grid/F1Tree overlay. Its default stroke is 2.4px; `DashboardPage` explicitly keeps its existing 3.6px first-access appearance; F1Grid/F1Tree use 2.4px. This design changes only spinner motion, not these thickness decisions.

## Approved behavior

- Keep the outer MUI indeterminate rotation so loading remains visibly active.
- Stop the circle's animated dash-length/offset keyframes and render a fixed arc (`stroke-dasharray: 80px, 200px`).
- The spinner arc and starting orientation must be repeatable whenever a loading indicator mounts. Its rotation can continue while mounted.
- Apply this motion consistently through `AppLoadingSpinner`; do not introduce a second spinner implementation for F1Grid, F1Tree, or page loaders.
- Preserve each caller's size, thickness, color, accessibility props, placement, loading lifecycle, and surrounding UI. In particular, retain the 34px/3.6px DashboardPage exception and the 34px/2.4px Grid/Tree overlay.

## Implementation boundaries

- Update only the shared spinner styling and directly related tests and spinner documentation.
- Do not change query timing, grid overlay behavior, loading text, spinner dimensions, colors, global theme, or API/data behavior.
- Do not alter skeleton-based loading states; they are a distinct presentation rather than indeterminate progress spinners.

## Verification

- Unit tests confirm a fixed dash array, disabled circle dash animation, retained outer rotation, 34px/2.4px shared defaults, explicit 3.6px thickness, and MUI prop forwarding.
- Existing F1Grid/F1Tree loading tests confirm their overlay and thickness contracts remain intact.
- In a browser, compare the same spinner at different points in time and across repeated loading starts. Confirm the visible arc length is stable, rotation remains active, and F1Grid/F1Tree/page spinners preserve their contextual size and thickness.
- Run the focused spinner and Grid/Tree tests, F1-Grid documentation tests, frontend production build, and `git diff --check`.
