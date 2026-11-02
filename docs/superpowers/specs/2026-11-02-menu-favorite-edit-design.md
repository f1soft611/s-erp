# Menu Favorite Edit Dialog Design

## Context

Menu favorites currently toggle immediately from the star and can be moved through a context menu. Users want a browser-bookmark-like editor: click the star to review/edit the favorite, choose root or a folder, save or remove it, and open the same editor from the row's more menu.

## Approaches

1. Keep the immediate star toggle and add a separate edit dialog only to the more menu. This preserves current behavior but leaves the primary star interaction inconsistent with the requested editor.
2. Open one edit dialog from both the star and the favorite's more-menu action. Persist the display name and folder alongside the menu reference. This matches the supplied examples and makes the name field meaningful.
3. Use a lightweight folder picker popover and leave name edits unsupported. This is simpler but does not match the shown editing form.

**Decision:** Use approach 2. A favorite's custom display name belongs to the user-specific favorite record; absent names (existing records) continue to display the canonical menu name.

## Interaction

- Clicking an unfilled star opens the editor with the canonical menu name, the menu URL read-only, and the root folder selected.
- Clicking a filled star opens the same editor with its saved name (or canonical menu name for a legacy row) and current folder selected.
- The folder selector lists root first and all existing user folders. A create-folder action is available from the editor and selects the newly created folder.
- Save creates a new favorite or updates its saved name and location. Remove deletes an existing favorite; for an unsaved menu, the remove action is hidden.
- The row's more menu provides `즐겨찾기 편집` for an existing favorite; existing root/folder management actions remain available.
- Closing/canceling the editor performs no write and does not change the selected menu or route.

## Data and API

- Add nullable `favorite_nm VARCHAR(100)` to `tb_user_menu_favorite`. NULL means use the current authorized menu's canonical name, preserving existing records.
- Include nullable `favoriteName` in favorite responses. The create request accepts it; location update accepts an optional name in addition to `folderId`.
- Validate provided names after trimming: 1–100 characters. Keep existing ownership, tenant, active-menu, and READ permission checks.
- Use the existing create, location-update, and delete endpoints. Add a dated migration, change record, and rollback in both schema-history locations; do not apply DDL to the database.

## UI boundaries and errors

- A focused dialog component owns the draft name/folder and submit/cancel state; it delegates API operations and refresh to the dashboard tree.
- Keep server state authoritative. Close the dialog only after a successful save/removal; on failure, keep the draft open and show the error.
- Prevent duplicate submissions while a request is pending. Do not navigate or select the menu from star, more-menu, or dialog actions.

## Verification

- Regression tests cover opening for a new/existing favorite, root default, folder selection, save/create, move+rename, remove, cancel without mutation, and more-menu edit entry.
- Backend tests cover optional legacy names and trimmed/length-validated names; mapper tests cover name persistence.
- Run frontend targeted tests/build, backend favorite tests, and browser checks at 375px, 768px, and 1280px. Capture screenshots in the existing result directory.
