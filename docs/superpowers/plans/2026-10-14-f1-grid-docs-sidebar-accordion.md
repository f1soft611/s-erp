# F1-Grid Documentation Sidebar Accordion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the F1-Grid documentation sidebar show only the selected document's group while preserving complete search results and existing navigation.

**Architecture:** Derive the expanded group directly from the selected document, avoiding a second source of state. In normal browsing, each group heading is a button that selects that group's first document, so exactly one group remains open; while searching, retain the existing grouped list of all matching documents and API results.

**Tech Stack:** React, TypeScript, MUI, CSS, Vitest, Testing Library, Vite, Playwright browser validation.

---

## Files and responsibilities

- `docs/directions/20261014/20261014_004_f1_grid_docs_sidebar_accordion_작업지시서.md` — approved purpose, boundaries, and completion criteria.
- `docs/plan/20261014/20261014_004_f1_grid_docs_sidebar_accordion_계획서.md` — project execution sequence.
- `docs/spec/20261014/20261014_004_f1_grid_docs_sidebar_accordion_상세사양서.md` — exact menu, search, accessibility, and verification contracts.
- `docs/superpowers/specs/2026-10-14-f1-grid-docs-sidebar-accordion-design.md` — user-approved design.
- `frontend/src/pages/f1-grid-docs/F1GridDocsPage.tsx` — selected-document-driven expanded group and group heading navigation.
- `frontend/src/pages/f1-grid-docs/F1GridDocsPage.css` — sidebar heading button, active/expanded, focus, and responsive appearance.
- `frontend/tests/f1-grid-docs.test.tsx` — initial group, group navigation, single-open invariant, and search regression tests.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md` — document sidebar and search behavior.
- `docs/result/20261014/f1-grid-docs-overhaul/20261014_004_f1_grid_docs_sidebar_accordion_작업결과.md` — result, validation, and screenshot references.
- `docs/result/20261014/f1-grid-docs-overhaul/screenshots/` — desktop and mobile verification captures.

## Task 1: Add failing accordion navigation tests

**Files:**
- Modify: `frontend/tests/f1-grid-docs.test.tsx`
- Read: `frontend/src/pages/f1-grid-docs/F1GridDocsPage.tsx`
- Read: `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`

- [ ] **Step 1: Test the initial expanded group and hidden inactive items.** Render `<F1GridDocsPage />`; assert the `시작하기` group button has `aria-expanded="true"`, `그리드와 데이터` has `aria-expanded="false"`, `첫 그리드 만들기` is present, and `기본 그리드` is absent from accessible buttons.
- [ ] **Step 2: Test group heading navigation.** Click the `그리드와 데이터` group button; assert the `기본 그리드` heading is rendered in the document, the group button is expanded, the `시작하기` button is collapsed, and the `기본 그리드` menu item is active.
- [ ] **Step 3: Test document navigation across groups.** From the `기본 그리드` document, click the `Cell Editing` menu item; assert its group is the only expanded group and the editing page/playground remains rendered.
- [ ] **Step 4: Test search bypasses accordion filtering.** Type `편집` in the existing `문서 검색` field; assert every matching document group result is visible and the matching API-result area continues to render independently.
- [ ] **Step 5: Run the focused tests and verify the new contract fails before implementation.**

Run from `frontend/`:

```powershell
npm run test -- tests/f1-grid-docs.test.tsx
```

Expected: existing tests pass, but the new accordion assertions fail because group headings are not buttons and inactive group documents are currently rendered.

## Task 2: Implement a selected-document-driven accordion

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1GridDocsPage.tsx`
- Modify: `frontend/src/pages/f1-grid-docs/F1GridDocsPage.css`
- Test: `frontend/tests/f1-grid-docs.test.tsx`

- [ ] **Step 1: Keep the search branch unchanged.** Continue mapping `filteredDocs` into every group that has matches, render its group label and all matching document buttons, and continue rendering `apiSearchMatches` separately.
- [ ] **Step 2: Replace the normal-menu group label with a navigation button.** For each nonempty document group, set its expanded state from `group.id === doc.group`; render the group label as a button with `aria-expanded={group.id === doc.group}`; on click call `selectDocument(groupDocs[0].id)`.
- [ ] **Step 3: Render only the expanded group's documents in normal mode.** Keep the group's document order and existing active-document class. Do not add independent expanded-group state; selecting a group’s first document or any document item determines which group remains open.
- [ ] **Step 4: Style the group button using existing sidebar tokens.** Keep the compact uppercase/muted group-heading hierarchy, provide visible hover and keyboard focus states, and retain readable wrapping within the sidebar at narrow viewports.
- [ ] **Step 5: Run the focused portal tests.**

Run from `frontend/`:

```powershell
npm run test -- tests/f1-grid-docs.test.tsx
```

Expected: all portal tests pass, including the initial active group, group-title navigation, single-open state, document switching, and search/API-result behavior.

## Task 3: Update portal documentation

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Read: `docs/spec/20261014/20261014_004_f1_grid_docs_sidebar_accordion_상세사양서.md`

- [ ] **Step 1: Document the normal navigation rule.** State that only the selected document's group is open and selecting a group title navigates to its first document.
- [ ] **Step 2: Document search behavior.** State that search shows all groups with matching docs plus API matches without accordion hiding results.

## Task 4: Verify in browser and record the result

**Files:**
- Create: `docs/result/20261014/f1-grid-docs-overhaul/20261014_004_f1_grid_docs_sidebar_accordion_작업결과.md`
- Create: `docs/result/20261014/f1-grid-docs-overhaul/screenshots/sidebar-accordion-desktop.png`
- Create: `docs/result/20261014/f1-grid-docs-overhaul/screenshots/sidebar-accordion-mobile.png`

- [ ] **Step 1: Run the frontend production build.**

Run from `frontend/`:

```powershell
npm run build
```

Expected: TypeScript and Vite complete with exit code 0. Record any non-fatal pre-existing chunk warning.

- [ ] **Step 2: Verify the desktop browser at 1280px.** Open `/f1-grid-docs`; confirm only `시작하기` is open, click `그리드와 데이터`, confirm the first document is selected and only that group is open, then capture the sidebar.
- [ ] **Step 3: Verify the mobile browser at 375px.** Open the mobile navigation, switch groups, run a search, and confirm the page has no horizontal overflow and matching groups/API entries remain reachable; capture the sidebar.
- [ ] **Step 4: Write the result report.** Record the implementation scope, targeted test/build results, measured desktop/mobile verification, and screenshot links. Do not claim a check passed unless its command or browser observation completed.

## Spec coverage self-review

- Single expanded group and current-document invariant: Tasks 1 and 2.
- Group title selecting its first document: Tasks 1 and 2.
- Search showing all matching groups/documents and API results: Tasks 1 and 2.
- Existing document selection/playground behavior: Task 1.
- Accessibility and responsive styling: Tasks 2 and 4.
- Project documentation and result evidence: Tasks 3 and 4.
