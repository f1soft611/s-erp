# Menu Favorites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-user menu favorites with root/one-level folders, context-menu management, and a conditional virtual Favorites module in the dashboard.

**Architecture:** Persist folders and menu references per authenticated user and tenant in PostgreSQL. The backend validates ownership and current accessible leaf permissions; the frontend composes the response with the existing `/menus/my` tree and reuses the dashboard's current routing. The virtual module is not a `tb_module` record and appears only while at least one favorite menu exists.

**Tech Stack:** Java 17, Spring Boot/eGovFrame, MyBatis, PostgreSQL, React, TypeScript, MUI, React Router, Vitest/Testing Library, JUnit 5.

---

## Source Documents

- `docs/superpowers/specs/2026-11-02-menu-favorites-design.md`
- `docs/directions/20261102/20261102_002_메뉴_즐겨찾기_작업지시서.md`
- `docs/plan/20261102/20261102_002_메뉴_즐겨찾기_계획서.md`
- `docs/spec/20261102/20261102_002_메뉴_즐겨찾기_상세사양서.md`
- `frontend/src/pages/dashboard/DashboardPage.tsx`
- `frontend/src/pages/dashboard/components/DashboardSidebar.tsx`
- `frontend/src/pages/dashboard/components/DashboardModuleSection.tsx`
- `frontend/src/pages/dashboard/components/DashboardMenuTree.tsx`
- `frontend/src/pages/dashboard/services/menuService.ts`
- `backend/src/main/java/egovframework/let/system/menus/`

## File Map

### DB / Backend

- Create `backend/DATABASE/20261102/20261102_001_create_menu_favorites.sql` and identical copy at `docs/database/20261102/20261102_001_create_menu_favorites.sql`.
- Create matching `20261102_001_change_menu_favorites_schema.md` and `20261102_001_rollback.sql` in both DB history folders.
- Modify `docs/database/db-schema.md` to document the two new tables.
- Create `MenuFavoriteFolderVO.java`, `MenuFavoriteVO.java`, `MenuFavoriteCreateFolderRequestVO.java`, `MenuFavoriteRenameFolderRequestVO.java`, `MenuFavoriteCreateRequestVO.java`, and `MenuFavoriteMoveRequestVO.java` under `backend/src/main/java/egovframework/let/system/menus/domain/model/`.
- Create `MenuFavoriteDAO.java` under `.../menus/domain/repository/`.
- Create `MenuFavoriteService.java` and `service/impl/MenuFavoriteServiceImpl.java`.
- Create `MenuFavoriteApiController.java`.
- Create `backend/src/main/resources/egovframework/mapper/let/system/menus/MenuFavorite_SQL_postgresql.xml` and register it in mapper configuration.
- Add `MenuFavoriteServiceImplTest.java`, `MenuFavoriteApiControllerTest.java`, and `MenuFavoriteMapperXmlTest.java` under `backend/src/test/java/egovframework/let/system/menus/`.

### Frontend

- Create `frontend/src/pages/dashboard/types/menuFavorite.types.ts`.
- Create `frontend/src/pages/dashboard/services/menuFavorite.service.ts`.
- Create `frontend/src/pages/dashboard/components/MenuFavoriteContextMenu.tsx` for reusable MUI menu/dialog actions.
- Create `frontend/src/pages/dashboard/components/MenuFavoritesTree.tsx` for root/folder/favorite rows and accessible more buttons.
- Modify `DashboardPage.tsx` to load and mutate favorites, compose the synthetic module, resolve favorite menu IDs against the authorized menu descriptors, and preserve existing route behavior.
- Modify `frontend/src/pages/dashboard/types/dashboard.ts` and `menuService.ts` as needed to preserve each backend numeric `menuId` when projecting authorized leaves into dashboard menu items.
- Modify `DashboardSidebar.tsx` and `DashboardModuleSection.tsx` to show/select the synthetic module without changing DB module descriptors.
- Modify `DashboardMenuTree.tsx` to expose favorite add/location actions only on authorized leaf menu nodes while preserving existing tree and recent-menu behavior.
- Add `frontend/tests/menu-favorites.test.tsx` and extend `frontend/tests/dashboard-sidebar.test.tsx`.
- Add a browser scenario/capture in `frontend/tests/menu-favorites.browser.mjs` using the existing browser setup; save images under `docs/result/20261102/menu-favorites/screenshots/`.
- Create `docs/result/20261102/menu-favorites/README.md` after implementation and verification.

## Implementation Tasks

### Task 1: Verify database metadata and create migration

**Files:** Both DB history directories, `docs/database/db-schema.md`

- [ ] **Step 1: Run the required read-only MCP metadata check.**

  Call `s-erp-postgresql-readonly.list_tables`, then `describe_table` for `tb_menu` and `tb_user`. Do not query row data. If the tools are not exposed, record that fact and inspect the mapper/schema history; do not claim a fresh MCP check.

- [ ] **Step 2: Write a failing schema contract test.**

  In `MenuFavoriteMapperXmlTest`, assert that the mapper contains statements for owner-scoped favorite listing, duplicate-menu uniqueness expectation, folder ownership filtering, and empty-folder count/delete guards. Run:

  ```powershell
  cd backend
  mvn -q test '-Dtest=MenuFavoriteMapperXmlTest'
  ```

  Expected: test fails because the mapper does not exist.

- [ ] **Step 3: Write the schema migration in both mirrored paths.**

  Create `tb_user_menu_favorite_folder` with identity primary key, tenant/user ownership, trimmed 1–40 character folder-name constraint, timestamps, and a composite unique key `(favorite_folder_id, tenant_id, user_id)`.

  Create `tb_user_menu_favorite` with identity primary key, tenant/user/menu ownership, nullable folder ID for root placement, timestamps, unique `(tenant_id, user_id, menu_id)`, FKs to tenant/user/menu, and a composite folder FK `(favorite_folder_id, tenant_id, user_id)`. Deleting a physical menu cascades only its favorite references. Deleting a populated folder is restricted.

  Add owner-scoped indexes for folder listing and favorite listing. Copy the exact SQL to both DB directories.

- [ ] **Step 4: Add guarded rollback and schema history.**

  Rollback must refuse to drop either table if data exists; if empty, drop favorites before folders. Record date, tables, impact, preconditions, and rollback behavior in both change records. Update the cumulative `db-schema.md`.

- [ ] **Step 5: Run mapper/schema validation.**

  Run the targeted Maven test, compare the mirrored SQL and markdown files byte-for-byte, then run `git diff --check`.

### Task 2: Implement owner-scoped backend API

**Files:** New favorite model, DAO, service, controller, mapper, tests; mapper configuration.

- [ ] **Step 1: Add failing service tests for owner and permission boundaries.**

  Cover a valid accessible leaf; reject another tenant, inactive menu, inaccessible menu, non-leaf/group, URL-less menu, malformed IDs, folder owned by another user, duplicate menu, and non-empty folder deletion. Verify identity is derived from `LoginVO.tenantId` and parsed `LoginVO.uniqId`, never from request data.

- [ ] **Step 2: Add failing API contract tests.**

  Verify:

  ```text
  GET    /api/v1/menus/favorites
  POST   /api/v1/menus/favorites/folders              { "folderName": "업무" }
  PUT    /api/v1/menus/favorites/folders/{folderId}   { "folderName": "결재" }
  DELETE /api/v1/menus/favorites/folders/{folderId}
  POST   /api/v1/menus/favorites                      { "menuId": 210, "folderId": 12 }
  PUT    /api/v1/menus/favorites/{favoriteId}/location { "folderId": null }
  DELETE /api/v1/menus/favorites/{favoriteId}
  ```

  Requests must not accept `userId` or `tenantId`.

- [ ] **Step 3: Add MyBatis statements and DAO methods.**

  Implement owner-filtered folder/favorite reads and writes. Menu reads join current `tb_menu`/`tb_module` labels but never use a client-supplied path. Count folder contents before delete and require the affected row to be owned by current tenant/user.

- [ ] **Step 4: Implement service validation and transaction boundaries.**

  Parse positive principal identifiers. Validate folder names after trim (1–40 Java characters). For add/move, inspect `SystemMenuService.getMyMenuTree(tenantId, loginId, roleId, roleCode)` and require the matching `menuId` to be an active leaf with a path and `permissions.read == true`. The tree includes active but unauthorized leaves with false permissions, so presence in the tree alone is not authorization. Translate duplicate unique violations to 409 and do not swallow unexpected DB exceptions.

  For list, return every owned folder, including empty folders, and only favorites whose menu IDs occur in the current accessible tree. Keep inaccessible rows persisted.

- [ ] **Step 5: Implement controller and verify backend tests.**

  Use the existing `ResultVoHelper` / `ResultVO` pattern and `@AuthenticationPrincipal LoginVO`. Run:

  ```powershell
  cd backend
  mvn -q test '-Dtest=MenuFavoriteServiceImplTest,MenuFavoriteApiControllerTest,MenuFavoriteMapperXmlTest'
  ```

  Expected: targeted tests pass.

### Task 3: Implement typed frontend API client

**Files:** `menuFavorite.types.ts`, `menuFavorite.service.ts`, `menu-favorites.test.tsx`

- [ ] **Step 1: Write failing service tests.**

  Assert each method calls the existing `apiClient` with the exact path/body and maps `folderId: null` to root placement. Assert errors reject and are not converted to empty success values.

- [ ] **Step 2: Define response types.**

  ```ts
  export type FavoriteFolder = { folderId: number; folderName: string };
  export type FavoriteMenu = {
    favoriteId: number;
    menuId: number;
    folderId: number | null;
  };
  export type MenuFavoritesResponse = {
    folders: FavoriteFolder[];
    favorites: FavoriteMenu[];
  };
  ```

- [ ] **Step 3: Implement API functions.**

  Export `fetchMenuFavorites`, `createMenuFavoriteFolder`, `renameMenuFavoriteFolder`, `deleteMenuFavoriteFolder`, `createMenuFavorite`, `moveMenuFavorite`, and `deleteMenuFavorite` using the exact routes in the detailed spec.

- [ ] **Step 4: Run service tests.**

  ```powershell
  cd frontend
  npx vitest run tests/menu-favorites.test.tsx
  ```

### Task 4: Build folder/favorite tree and contextual actions

**Files:** `MenuFavoritesTree.tsx`, `MenuFavoriteContextMenu.tsx`, frontend tests

- [ ] **Step 1: Write failing tree interaction tests.**

  Test root items and folders; folder empty state; add folder, rename, empty-folder delete; reject populated-folder delete; move favorite to root/folder; unfavorite; action error keeps prior state; and a touch/keyboard more button exposes the same actions as right-click.

- [ ] **Step 2: Implement one-level tree projection.**

  Project `folders` and `favorites` into root children plus folder children sorted by their IDs. Resolve each favorite `menuId` against the current accessible `MenuItem` descriptor. Omit an unresolved item without deleting its server record.

- [ ] **Step 3: Implement a shared MUI context menu.**

  Use one menu component parameterized by target kind (`available-menu`, `root`, `folder`, `favorite`). For pointer context events, prevent the browser menu and anchor to the pointer position. Add an accessible per-row `more` button with `aria-label="즐겨찾기 작업: {label}"` and use the same action model.

- [ ] **Step 4: Implement folder name entry and delete guard feedback.**

  Trim on submit; allow 1–40 characters only. Keep folder deletion disabled if its visible favorite count is nonzero and still display server 409 feedback if a concurrent change makes it non-empty.

- [ ] **Step 5: Run component tests.**

  ```powershell
  cd frontend
  npx vitest run tests/menu-favorites.test.tsx
  ```

### Task 5: Integrate virtual module and menu navigation

**Files:** `DashboardPage.tsx`, `DashboardSidebar.tsx`, `DashboardModuleSection.tsx`, `DashboardMenuTree.tsx`, dashboard tests

- [ ] **Step 1: Add failing integration tests.**

  Cover: no menu favorites means no `즐겨찾기` module button; first saved favorite reveals it; selecting it shows root/folder tree; selecting a favorite navigates to its authorized original URL and retains the current-menu highlight; no generated `tb_module` descriptor is mutated; recent menu UI remains unchanged.

- [ ] **Step 2: Add synthetic module selection state.**

  Keep the route-selected real module separate from the sidebar's transient panel selection. Use `__favorites__` only as the rail/panel selection ID; do not replace the real selected module used for content, breadcrumbs, permissions, routing, or recent-menu records. Pass favorites state/actions through `DashboardSidebar`. Clicking a real module clears the favorites-panel selection and restores existing behavior; selecting a favorite navigates to its authorized route while the favorites panel may remain open.

- [ ] **Step 3: Add conditional module rail item.**

  Render `즐겨찾기` only when `favorites.length > 0`; use an existing icon package export and maintain rail responsiveness. Selection opens the favorites tree, not an API/DB module.

- [ ] **Step 4: Reuse the authorized menu route mapping.**

  Resolve each favorite numeric `menuId` against the `menuId` retained on the authorized `MenuTreeNode`/`MenuItem`, then use that matched menu's existing string route ID and module for navigation. Do not use path-derived IDs as the identity lookup and do not navigate using favorite-supplied URL data. Keep selected route highlighting based on original menu identity.

- [ ] **Step 5: Add add/manage entry point on ordinary leaf menus.**

  Expose actions only for accessible leaf nodes with paths. The location selector includes root and existing folders and permits folder management even when no favorite menu exists and the virtual module is hidden.

- [ ] **Step 6: Run integration and regression tests.**

  ```powershell
  cd frontend
  npx vitest run tests/menu-favorites.test.tsx tests/dashboard-sidebar.test.tsx
  ```

### Task 6: Verify responsive UI and record results

**Files:** Browser test, result README/screenshots, all feature files

- [ ] **Step 1: Add browser setup with deterministic mocks.**

  Mock only the favorites service and authenticated menu response; do not read user or tenant database rows. Test root/folder context menu at desktop and accessible more actions on mobile.

- [ ] **Step 2: Run the browser test at 375px, 768px, and 1280px.**

  Use the established browser test harness. Reuse an existing S-ERP server on `127.0.0.1:4173` if present; never stop a pre-existing server. Verify no horizontal overflow, context menu stays in viewport, and all actions can be reached.

- [ ] **Step 3: Run final focused checks.**

  ```powershell
  cd frontend
  npm run build
  npx vitest run tests/menu-favorites.test.tsx tests/dashboard-sidebar.test.tsx
  cd ..\backend
  mvn -q test '-Dtest=MenuFavoriteServiceImplTest,MenuFavoriteApiControllerTest,MenuFavoriteMapperXmlTest'
  cd ..
  git diff --check
  ```

- [ ] **Step 4: Write `docs/result/20261102/menu-favorites/README.md`.**

  Record changed files, migration paths, whether MCP was available, tests with actual outcomes, screenshots at all three viewports, and explicitly state that the migration was not applied to the live database.

- [ ] **Step 5: Verify the final diff.**

  Compare the two database migration/change/rollback copies, review all scoped changes, and confirm no generated screenshots/logs outside the result directory. Do not commit unless explicitly requested.

## Spec Coverage

- Virtual module visibility, route and current-menu state: Task 5.
- Folder CRUD, single-location placement, move/unfavorite, accessible fallback: Tasks 2, 4, 5.
- Principal ownership, tenant isolation, permission revocation/recovery: Task 2.
- Context menu and touch/keyboard equivalent: Task 4.
- Empty module with retained folders and folder management path: Tasks 4 and 5.
- DB migration, guarded rollback, cumulative schema and no live DDL: Task 1.
- Responsive validation, screenshots, result record: Task 6.
