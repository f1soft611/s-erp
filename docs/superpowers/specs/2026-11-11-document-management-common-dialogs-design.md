# Document Management Common Dialogs Design

## Goal

Use the shared `CommonDialog` shell for ordinary confirmation and input dialogs in document management, including the pin confirmation. Preserve the existing interaction and avoid changing dialogs in unrelated areas.

## Approaches

1. **Migrate document-management callers to `CommonDialog` (recommended).** Replace direct MUI dialogs and the document-management calls to `UnsavedChangesConfirmDialog`. This standardizes the requested area while leaving the shared confirmation component and its other consumers unchanged.
2. **Change `UnsavedChangesConfirmDialog` globally.** This would make it use `CommonDialog`, but would also change unrelated screens that use it and expands the visual regression surface.
3. **Migrate only direct MUI dialogs.** This is narrower but leaves the pin and other document-management confirmations outside the canonical dialog shell.

Approach 1 best matches the request to standardize all document-management dialogs while limiting global effects.

## Scope and behavior

- Convert document approval cancel/delete dialogs and reference-add input dialog to `CommonDialog`.
- Convert document-management confirmation uses for pin/unpin, document-kind changes, template replacement, and template-setting changes to `CommonDialog`.
- Add a `sm` size to `CommonDialog` to retain the reference-add dialog's existing MUI `maxWidth="sm"` footprint (600px).
- Preserve titles, descriptions, labels, pending-state disabling, close behavior, handlers, and content. Use `CommonDialog` close handling to retain each existing cancel/close rule.
- Keep already standardized dialogs unchanged.
- Exclude `ImageViewerDialog` and popovers because they are specialized overlays, not ordinary confirmation or input dialogs.
- Do not alter the shared `UnsavedChangesConfirmDialog` component or its non-document-management consumers.

## Validation

- Add focused tests for the new `sm` width and document modal interactions/labels.
- Run the affected document dialog and document write tests, then the frontend build.
- Check the relevant modal rendering at 375px, 768px, and 1280px and record screenshots in the dated result directory.
