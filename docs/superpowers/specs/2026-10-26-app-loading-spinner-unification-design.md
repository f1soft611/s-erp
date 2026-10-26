# Application Loading Spinner Unification Design

## Context

F1Grid and F1Tree render loading states through the shared `AppLoadingSpinner`, but other page and dialog loading states still render MUI `CircularProgress` directly. This creates inconsistent spinner implementation and makes it difficult to tune visibility consistently. Browser inspection of the F1Grid large-dataset example confirmed that its overlay covers the grid and centers a 34px spinner, but the current 1.8px stroke is thin; the browser screenshot tool also failed to capture the active spinner reliably.

## Approved design

- Use `AppLoadingSpinner` as the common implementation for every indeterminate `CircularProgress` in `frontend/src`.
- Extend the shared component to accept the MUI spinner props needed by existing callers, including size, thickness, color, and accessible labels.
- Preserve each loading state’s existing size, color, label, placement, wrapper, timing, and surrounding content. Where MUI's default size was previously used, pass that size explicitly so the common component does not change its rendered dimensions.
- Use a 34px/2.4px shared default so ordinary page loaders match F1Grid/F1Tree and the large-data example. DashboardPage explicitly keeps its existing 3.6px first-access appearance.
- Render F1Grid and F1Tree spinners at 34px with a 2.4px stroke. F1Tree continues to delegate loading rendering to F1Grid.
- Preserve the existing F1Grid overlay's theme background alpha, loading behavior, interaction blocking, and accessibility state.
- Do not add text, icons, or new loading states, and do not change when a loading state starts or ends.

## Scope

Update the shared spinner, direct `CircularProgress` call sites in application source, directly related tests, and the dated spinner work documents. Relevant call sites include save/action indicators, content panels, dialogs, document feeds, file views, and pagination. Their contextual sizes and colors remain unchanged.

No backend, API, database, request lifecycle, or product workflow changes are included.

## Alternatives considered

1. Keep independent MUI `CircularProgress` elements and only update the grid. This leaves the inconsistency the user identified.
2. Replace every spinner with one identical size and thickness. This would alter existing compact action indicators and content layouts.
3. Use one shared component while preserving contextual size and color, with a 2.4px grid-specific stroke. This unifies implementation while retaining existing UI roles and addresses the user's visibility concern without returning to the previously rejected 3.6px grid stroke. This is the approved approach.

## Browser follow-up decision

The user clarified that the concern was inconsistent application across pages, not a request to change the agreed Grid/Tree thickness. Keep the 2.4px Grid/Tree stroke and align ordinary shared-spinner defaults with that stroke. DashboardPage is the only 34px·3.6px first-access exception. Verify that archive F1Tree, Materials F1Grid, and ordinary page loading indicators match the large-data example in thickness while preserving each contextual size, theme background, and loading lifecycle.

## Verification

- Unit tests cover shared component defaults and forwarded MUI properties, plus representative page/content and action loading states.
- A source search confirms application call sites no longer render MUI `CircularProgress` directly outside `AppLoadingSpinner`.
- Run focused tests for the common component and affected loading consumers, then run the frontend production build.
- In a real browser, trigger F1Grid loading and verify the 34px, 2.4px spinner is centered inside the grid overlay at 375px, 768px, and 1280px viewports. Compare the Materials F1Grid and archive F1Tree loading states. Confirm the overlay remains within the grid, page width does not overflow, and loading completes normally.
- Record screenshots and results in the dated result directory. If browser screenshot capture remains inconsistent, record the limitation and use live DOM/style measurements as additional evidence rather than claiming visual confirmation from a stale image.
