# App Initial Loading Spinner Removal

## Context

`DashboardPage` waits for the initial menu request before rendering the sidebar and page content. While that request is pending, it currently renders a centered `AppLoadingSpinner` in the dashboard shell. The shared spinner is also used by other loading states, which are outside this request.

The existing menu-loading gate prevents route selection and page content from being rendered before menu data is ready. The existing error state and retry action are shown if the initial request fails.

## Approved behavior

- Remove only the centered spinner displayed while the dashboard's initial menu request is pending.
- Keep the menu-loading gate unchanged. Until menu data is ready, the dashboard shell remains visible with its background and no child loading indicator or dashboard content.
- Keep menu request timing, route validation, the menu error message, and retry behavior unchanged.
- Keep all other uses of `AppLoadingSpinner` unchanged.

## Implementation boundaries

- Update the initial-loading branch in `frontend/src/pages/dashboard/DashboardPage.tsx` and add focused regression coverage for the absence of the startup spinner while preserving the loading gate.
- Do not modify the shared `AppLoadingSpinner`, other loading indicators, API behavior, menu state lifecycle, or dashboard layout after loading completes.
- Update the dated task plan, detailed specification, and result documentation for this behavior.

## Verification

- A focused test confirms that while initial menus are pending, the spinner is not rendered and the dashboard content remains gated.
- Existing menu failure/retry and normal loaded-dashboard behavior remain unchanged.
- Run the focused dashboard tests and frontend production build.
- Verify the startup page in the existing browser at 375px, 768px, and 1280px; capture the pending state for the result record.
