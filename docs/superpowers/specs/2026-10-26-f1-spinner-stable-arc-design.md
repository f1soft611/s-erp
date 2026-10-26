# F1 Spinner MUI Animation Design

## Context

The shared `AppLoadingSpinner` had a component-local style override that set `animation: none` and a custom `stroke-dasharray` on `.MuiCircularProgress-circle`. This bypassed the circle's MUI indeterminate dash keyframes and made the progress indicator appear as a static, partial arc. A source search found no separate global CSS rule overriding the MUI progress circle; the offending rule was local to the shared component.

The fixed-arc proposal in the initial version of this design was reconsidered after the user clarified that the desired result is the commonly used MUI indeterminate spinner. A changing arc length is part of MUI's default animation, not a CSS defect. Do not freeze that arc.

## Approved behavior

- Render the standard MUI `CircularProgress` with `variant="indeterminate"`.
- Remove the custom `styled` wrapper and any app-authored `animation`, `strokeDasharray`, or circle stroke override.
- Retain the MUI default root rotation and circle dash animation.
- Preserve contextual sizes, thickness, theme color, accessibility props, placement, and loading lifecycle.
- Keep current agreed sizes/thicknesses: shared default 34px/2.4px, Dashboard first-access 34px/3.6px, and F1Grid/F1Tree 34px/2.4px. Do not broaden the change to 40px/4px or change the color contract.

## Verification

- Unit tests confirm the rendered element is indeterminate, MUI's circle dash keyframes are present and active, and no component-local `animation: none` override is emitted.
- Unit tests continue to verify default and contextual sizes, thicknesses, color, and accessibility prop forwarding.
- F1Grid/F1Tree loading tests confirm their overlay and thickness contracts remain intact.
- Browser inspection confirms MUI's built-in animation varies the arc over time by design and that no fixed-arc custom CSS remains.
- Run focused spinner/Grid/Tree/docs tests, frontend production build, and `git diff --check`.
