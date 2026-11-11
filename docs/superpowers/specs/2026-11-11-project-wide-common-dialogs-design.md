# Project-Wide Common Dialogs Design

## Goal

Standardize all ordinary frontend MUI dialogs on `CommonDialog`, including shared unsaved-change confirmations and specialized dialog content, while preserving each workflow's content and actions.

## Approaches

1. **Migrate all MUI `Dialog` shells to `CommonDialog` (recommended).** Keep one shared shell and preserve each dialog's custom content inside it. The shared `UnsavedChangesConfirmDialog` retains its API but delegates rendering to `CommonDialog`.
2. **Change only document-management dialogs.** This avoids broad UI impact but leaves the many other direct MUI dialog instances inconsistent with the user's expanded project-wide request.
3. **Create several area-specific common wrappers.** This would duplicate visual behavior and continue to fragment size, accessibility, and header conventions.

Approach 1 directly meets the expanded request and minimizes future drift. `CommonDialog.tsx` remains the only component that directly renders MUI `Dialog`.

## Scope and behavior

- Audit and migrate the 14 other frontend source files currently rendering MUI `<Dialog>`, including dashboard favorites, F1-Grid pickers, system settings, archive, notifications, document management, image viewing, and the shared unsaved confirmation.
- Add `sm` (600px) and `xl` (1200px) widths to preserve existing selector and image-viewer footprints.
- Add optional `titleId` and `closeButtonLabel` props so existing accessibility IDs and the image viewer's descriptive close label remain intact.
- Preserve modal content, API calls, button labels/order, pending-state guards, Escape/backdrop behavior, errors, and submit/cancel callbacks.
- Keep non-dialog overlays (`Popover`, `Menu`, `Drawer`, and print portals) unchanged.

## Validation

- Add focused CommonDialog size/accessibility tests and a shared unsaved-confirmation shell test before implementation.
- Run existing feature tests for affected areas, the full frontend Vitest suite, and `npm run build`.
- Check 375px, 768px, and 1280px browser layouts and record representative screenshots in the dated result directory.
