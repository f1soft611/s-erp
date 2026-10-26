# App Initial Loading Spinner Removal

## Context

`AppRouter` uses `React.lazy` for route pages and currently renders an `AppLoadingSpinner` in its `Suspense` fallback. After the dashboard route module loads, `DashboardPage` waits for the initial menu request before rendering the sidebar and page content, and currently shows a second centered spinner during that request. The shared spinner is also used by other loading states, which are outside this request.

The existing menu-loading gate prevents route selection and page content from being rendered before menu data is ready. The existing error state and retry action are shown if the initial request fails.

## Approved behavior

- Remove only the centered spinner displayed while the dashboard's initial menu request is pending.
- Keep route-level lazy loading, but remove the spinner from the `Suspense` fallback so it renders no loading indicator while a route module is loading.
- Keep the menu-loading gate unchanged. Until menu data is ready, the dashboard shell remains visible with its background and no child loading indicator or dashboard content.
- Keep menu request timing, route validation, the menu error message, and retry behavior unchanged.
- Keep all other uses of `AppLoadingSpinner` unchanged. This change is limited to the two app-entry indicators: the route-level `Suspense` fallback and the dashboard initial-menu branch.

## Implementation boundaries

- Update `frontend/src/routes/AppRouter.tsx` to keep its `Suspense` boundary with a null fallback, and update the initial-loading branch in `frontend/src/pages/dashboard/DashboardPage.tsx`.
- Add focused regression coverage for the absence of both app-entry indicators while preserving the menu loading gate.
- Do not modify the shared `AppLoadingSpinner`, other loading indicators, API behavior, menu state lifecycle, or dashboard layout after loading completes.
- Update the dated task plan, detailed specification, and result documentation for this behavior.

## Verification

- A focused test confirms that route loading and initial menu loading render no progress spinner, and dashboard content remains gated until menus resolve.
- Existing menu failure/retry and normal loaded-dashboard behavior remain unchanged.
- Run the focused dashboard tests and frontend production build.
- Verify the startup page in the existing browser at 375px, 768px, and 1280px; capture the pending state for the result record.
