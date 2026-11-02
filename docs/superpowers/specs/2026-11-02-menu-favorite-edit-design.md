# Menu Favorite Edit Dialog Design

## Context

Menu favorites currently toggle immediately from the star and can be moved through a context menu. Users want a browser-bookmark-like editor with a folder/name form and `더보기`, `완료`, and `제거` actions.

## Approaches

1. Keep direct star toggling and open an editor after only the more-menu action. This does not provide the requested post-registration workflow.
2. Register immediately when an empty star is clicked, then open the editor. Clicking a filled star reopens the editor; save persists name/location, remove deletes the favorite, and `더보기` opens the virtual favorites module. This follows the user's correction and screenshot controls.
3. Delay favorite creation until the editor is saved. This avoids creating a row for an unsaved dialog but conflicts with the explicit requirement that the favorite be registered on star click.

**Decision:** Use approach 2. A favorite's custom display name belongs to the user-specific favorite record; absent names (existing records) continue to display the canonical menu name.

## Interaction

- Clicking an unfilled star first creates a root favorite with the canonical menu name. After the server confirms creation and the list refreshes, the editor opens with that name, the menu URL read-only, and root selected.
- Clicking a filled star opens the same editor with its saved name (or canonical menu name for a legacy row) and current folder selected.
- The folder selector lists root first and all existing user folders. A create-folder action is available from the editor and selects the newly created folder.
- `완료` saves the name and folder location. `제거` deletes the favorite. Closing the dialog leaves a newly registered favorite at its initially saved root location.
- `더보기` closes the dialog and selects the virtual favorites module without changing the route or active menu.
- Star and dialog actions do not select the menu or navigate to its route.

## Data and API

- Add nullable `favorite_nm VARCHAR(100)` to `tb_user_menu_favorite`. NULL means use the current authorized menu's canonical name, preserving existing records.
- Include nullable `favoriteName` in favorite responses. The create request accepts the canonical initial name; location update accepts an optional name in addition to `folderId`.
- Validate provided names after trimming: 1–100 characters. Keep existing ownership, tenant, active-menu, and READ permission checks.
- Use the existing create, location-update, and delete endpoints. Add a dated migration, change record, and rollback in both schema-history locations; do not apply DDL to the database.

## UI boundaries and errors

- A focused dialog component owns the draft name/folder and submit/cancel state; it delegates API operations and refresh to the dashboard tree.
- Keep server state authoritative. Close the dialog only after a successful save/removal; on failure, keep the draft open and show the error.
- Prevent duplicate submissions while a request is pending. Do not navigate or select the menu from star, more-menu, or dialog actions.

## Verification

- Regression tests cover create-before-open, opening an existing favorite, root default, folder selection, save, move+rename, remove, close without mutation, and `더보기` virtual-module selection without route change.
- Backend tests cover optional legacy names and trimmed/length-validated names; mapper tests cover name persistence.
- Run frontend targeted tests/build, backend favorite tests, and browser checks at 375px, 768px, and 1280px. Capture screenshots in the existing result directory.
