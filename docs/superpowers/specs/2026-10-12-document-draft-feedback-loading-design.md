# Document Draft Feedback and Loading Design

## Context

The document composer currently renders draft-save success inline and shows initial
lookup/template-loading messages inside the form below the document tabs. The
project already provides `NotificationContext` for transient success toasts,
top-of-content alerts for actionable errors, and centered `CircularProgress`
indicators for blocking content loads.

## Approved behavior

### Save feedback

- A fully successful draft save, including confirmation of all selected
  attachments, displays a success toast through `NotificationContext`.
- Success is not duplicated as an inline alert in the composer.
- A draft-save failure or a partial/unknown attachment result is presented in
  the composer’s top error area. Keep the draft, document ID, and attachment
  status available so the user can correct or retry without losing work.
- Successful reconciliation of an ambiguous attachment is a success toast.
- No save, transaction, attachment API, or automatic-close behavior changes.

### Blocking composer loading

- During the initial composer lookups and while the selected form body is being
  fetched, replace the complete composer body below the tabs with a centered
  `CircularProgress`.
- Keep the common dialog header, close control, and footer visible. Disable form
  interaction and saving until the active loading operation completes.
- Loading failures appear in the composer’s top error area after the spinner is
  removed; do not show loading copy below the tabs.
- Continue to use the existing dialog and application notification patterns.

## Implementation boundaries

- Limit changes to the document composer hook/component, focused composer tests,
  and the existing dated direction/plan/spec/result documents.
- Do not change shared notification, page-message, dialog, or loading
  infrastructure.
- Do not change server contracts, database behavior, or the approved
  document-save scope.

## Verification

- Verify successful save feedback uses the shared success notification and no
  success alert is rendered in the composer.
- Verify save and attachment errors remain visible in the composer’s top error
  area.
- Verify initial lookups and form-body loading each render the blocking centered
  spinner instead of tab-area loading alerts, and that the form returns after
  loading completes.
- Run the focused document composer tests and frontend production build.
- Check the responsive composer in the browser at 375px, 768px, and 1280px.
