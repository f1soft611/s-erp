# Menu Favorite Edit Dialog Implementation Plan

> **For agentic workers:** Implement this plan task-by-task with TDD and verify each backend/frontend boundary before moving on.

**Goal:** Register a favorite immediately from an empty star and then let users edit its name/location, remove it, or open the favorites module from a single dialog.

**Architecture:** Persist an optional custom favorite name on the existing user-owned favorite row, using nullable `favorite_nm` so old favorites still fall back to their authorized menu name. Reuse the current create, location update, delete, and folder APIs; keep dialog draft state inside a focused UI component and refresh server state after successful operations.

**Tech Stack:** PostgreSQL migration history, Java/Spring/MyBatis, React/TypeScript, MUI, Vitest/Testing Library, Playwright.

---

## Files and responsibilities

- `backend/DATABASE/20261102/` and `docs/database/20261102/`: additive favorite-name migration, rollback, and change record; database remains untouched.
- `backend/src/main/java/egovframework/let/system/menus/domain/model/`: expose optional `favoriteName` on create/location requests and response favorite model.
- `backend/src/main/java/egovframework/let/system/menus/service/impl/MenuFavoriteServiceImpl.java`: trim and validate provided names, retain owner and menu permission checks.
- `backend/src/main/resources/egovframework/mapper/let/system/menus/MenuFavorite_SQL_postgresql.xml`: select/insert/update favorite name; specify JDBC types for nullable values.
- `backend/src/test/java/egovframework/let/system/menus/`: regression tests for nullable names and validation.
- `frontend/src/pages/dashboard/components/MenuFavoriteEditDialog.tsx`: shared `CommonDialog` for name, read-only menu URL, root/folder selection, save/remove/cancel; no folder-create action.
- `frontend/src/pages/dashboard/components/MenuFavoritesTree.tsx`: display custom favorite names and provide a direct header `새 폴더` action.
- `frontend/src/pages/dashboard/components/DashboardMenuTree.tsx`: create on empty-star click, open the editor for new/existing favorites, remove the general-menu more button, and connect `더보기` to virtual-module selection without selecting/navigating the menu.
- `frontend/src/pages/dashboard/components/MenuFavoriteContextMenu.tsx`: retain folder management actions; the star and dialog are the favorite editing interface.
- `frontend/src/pages/dashboard/services/menuFavorite.service.ts` and `types/menuFavorite.types.ts`: carry `favoriteName` in existing requests/responses.
- `frontend/tests/menu-favorites.test.tsx`: dialog and menu interaction regression coverage.
- `frontend/tests/menu-favorites.browser.mjs`: verify dialog at 375px, 768px, and 1280px and capture screenshots.
- `docs/spec/20261102/20261102_002_메뉴_즐겨찾기_상세사양서.md`, `docs/result/20261102/menu-favorites/README.md`: record behavior, migration, and verification.

### Task 1: Persist a nullable custom favorite name

1. Add mapper tests first: create/update SQL must bind `favoriteName`, select must return it, and nullable location IDs must remain explicitly BIGINT.
2. Run the focused Maven test and confirm it fails on missing favorite-name mapping.
3. Add `favorite_nm VARCHAR(100) NULL` migration and guarded rollback to both dated schema folders; add matching change records and update the cumulative schema document.
4. Add optional `favoriteName` to create and location request models and `MenuFavoriteVO`. Null keeps legacy behavior; a non-null name is trimmed and must be 1–100 characters.
5. Update mapper select/insert/location-update statements. Update must change name only when `favoriteName` was supplied, preserve it for folder-only moves, and bind nullable IDs with their correct JDBC types.
6. Add service tests for trimming, invalid names, legacy null names, and name-preserving moves; run `mvn -q -f backend\pom.xml '-Dtest=MenuFavoriteMapperXmlTest,MenuFavoriteServiceImplTest,MenuFavoriteApiControllerTest' test`.

### Task 2: Build and connect the editor dialog

1. Write frontend tests that fail until an outline star creates a root favorite with the canonical name before opening the dialog; a filled star opens the saved name and folder.
2. Add `MenuFavoriteEditDialog.tsx` using `CommonDialog`, with controlled name/folder fields, root-first folder options, save/remove/cancel buttons, pending state, and inline error handling. Do not create folders in the editor; do not mutate or close on cancel/failure.
3. Extend favorite service calls to send `favoriteName` on create and optional name plus `folderId` on location update.
4. In `DashboardMenuTree`, create a root favorite with the canonical name on an empty-star click, refresh, then open the editor. Clicking an existing filled star opens it directly. Save updates name/location; remove deletes and refreshes; `더보기` closes it and selects the virtual favorites module. Prevent menu selection/route changes.
5. Add a direct folder-create dialog from the favorites module header, keep context menus for folder/location actions, and verify custom favorite names in the virtual module.
6. Test immediate create-before-open, root default, folder selection, rename+move, removal, close without additional mutation, `더보기` module selection, save failure preserving draft, direct folder creation, and no route change. Run `Set-Location frontend; npm run test -- tests/menu-favorites.test.tsx`.

### Task 3: Verify, document, and capture

1. Run `Set-Location frontend; npm run build`.
2. Run backend targeted favorite tests from Task 1.
3. Extend and run `Set-Location frontend; node tests/menu-favorites.browser.mjs`, checking dialog visibility, field interaction, no route change, and no horizontal overflow at 375px, 768px, and 1280px.
4. Save screenshots in `docs/result/20261102/menu-favorites/screenshots/`; update the result README, detailed spec, and approved design with the shared modal, direct folder action, removed general-menu more button, custom-name fallback, and migration details.
5. Run `git diff --check`, compare migration/change/rollback copies across `docs/database/20261102/` and `backend/DATABASE/20261102/`, and confirm no DDL was applied.
