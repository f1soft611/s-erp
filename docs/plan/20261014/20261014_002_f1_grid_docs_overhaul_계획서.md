# F1-Grid 개발자 문서 포털 전면 개편 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the F1-Grid documentation portal around a feature-first menu and make its explanations, options, examples, and playgrounds complete and consistent with the supported public API.

**Architecture:** Keep the existing static document-data model and F1-Grid runtime unchanged. Add grouped navigation, searchable API entries, section anchors, and a responsive three-column reader to the existing portal components; document user-facing APIs from exported types and verify completeness with focused tests.

**Tech Stack:** React, TypeScript, MUI, CSS, Vitest, Testing Library, Vite, Playwright/browser.

---

## Files and responsibilities

- `docs/directions/20261014/20261014_002_f1_grid_docs_overhaul_작업지시서.md` — approved task goals, scope, and completion criteria.
- `docs/superpowers/specs/2026-10-14-f1-grid-docs-overhaul-design.md` — approved design and completeness contract.
- `docs/spec/20261014/20261014_002_f1_grid_docs_overhaul_사양서.md` — implementation-level menu, API inventory, behavior, and verification specification.
- `docs/plan/20261014/20261014_002_f1_grid_docs_overhaul_계획서.md` — this execution plan.
- `frontend/src/shared/components/f1-grid/types/grid.types.ts` and `frontend/src/shared/components/f1-grid/index.ts` — source of truth for exported user-facing API names and signatures; read-only in this task.
- `frontend/src/pages/f1-grid-docs/types.ts` — typed navigation/document metadata and section data shape.
- `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts` — feature pages, option tables, API reference, examples, playground assignment, and search text.
- `frontend/src/pages/f1-grid-docs/F1GridDocsPage.tsx` — grouped navigation, search, selected document, responsive navigation controls, theme, and section TOC.
- `frontend/src/pages/f1-grid-docs/components/DocContent.tsx` — document sections, API rows, stable anchors, and links to reference entries.
- `frontend/src/pages/f1-grid-docs/components/DocCodeBlock.tsx` — retain the existing copy interaction and accessible feedback.
- `frontend/src/pages/f1-grid-docs/components/F1GridPlayground.tsx` — retain and position existing fixed-data demonstrations; change only demonstrations needed to match documented behavior.
- `frontend/src/pages/f1-grid-docs/F1GridDocsPage.css` — three-column desktop layout and responsive light/dark presentation.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md` — synchronize the feature inventory and portal/API documentation contract.
- `frontend/tests/f1-grid-docs.test.tsx` — API coverage, search, grouped navigation, section links, copy, and playground regression tests.
- `docs/result/20261014/f1-grid-docs-overhaul/` — result report and 375px, 768px, and 1280px browser screenshots.

## Task 1: Write the implementation-level specification

**Files:**
- Create: `docs/spec/20261014/20261014_002_f1_grid_docs_overhaul_사양서.md`
- Read: `docs/directions/20261014/20261014_002_f1_grid_docs_overhaul_작업지시서.md`
- Read: `docs/superpowers/specs/2026-10-14-f1-grid-docs-overhaul-design.md`
- Read: `frontend/src/shared/components/f1-grid/types/grid.types.ts`
- Read: `frontend/src/shared/components/f1-grid/index.ts`
- Read: `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- Read: `frontend/src/shared/components/f1-grid/tree/F1Tree.tsx`
- Read: `frontend/tests/f1-grid*.test.tsx`

- [ ] **Step 1: Inventory the exported component API.** Record all props, column properties, ref methods, user-facing types, aliases, editor values, and plugin/callback signatures from the exported type file. Inspect implementations and focused tests for defaults, runtime behavior, and constraints that are not stated by the types.
- [ ] **Step 2: Specify capability-to-API coverage.** Map every inventoried API entry to a feature page and a full-reference category (`F1GridProps`, `F1GridColumn`, `F1TreeProps`, `F1GridRef`, `F1TreeRef`, shared types/plugins/data source). Include exact defaults only when confirmed from implementation or tests.
- [ ] **Step 3: Specify navigation and responsive behavior.** Record the approved 12 capability groups, search fields and result behavior, API row anchors, desktop three-column layout, mobile collapse behavior, route/theme preservation, and fixed local-data playground constraints.
- [ ] **Step 4: Review the specification against the approved direction and design.** Ensure every completion criterion has a corresponding API entry, implementation task, or verification check; remove unsupported behavior claims.

## Task 2: Add failing portal contract tests

**Files:**
- Modify: `frontend/tests/f1-grid-docs.test.tsx`
- Read: `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`
- Read: `frontend/src/pages/f1-grid-docs/types.ts`
- Read: `frontend/src/shared/components/f1-grid/types/grid.types.ts`

- [ ] **Step 1: Add the public API inventory assertion.** Define the expected identifier lists from the inspected public types and assert that the API-reference document exposes every entry. The test should flatten only API sections:

```tsx
import { getF1GridDoc } from '../src/pages/f1-grid-docs/data/f1GridDocs';

const apiDoc = getF1GridDoc('api-reference');
const documentedNames = apiDoc.sections.flatMap((section) =>
  section.type === 'api' ? section.rows.map(([name]) => name) : [],
);

expect(new Set(documentedNames)).toEqual(new Set(expectedPublicApiNames));
```

The `expectedPublicApiNames` literal is transcribed from the inventory in the implementation specification and must include all declared component/type names and members, not internal exports: `F1GridProps` (`rows`, `dataSource`, `onDataSourceError`, `columns`, `rowKey`, `rowFormPlugin`, `ariaLabel`, `columnLine`, `stripeRows`, `storageKey`, `height`, `minHeight`, `maxHeight`, `rowHeight`, `minRowHeight`, `maxRowHeight`, `resizableRows`, `resizableColumns`, `minColumnWidth`, `virtualizeRows`, `virtualizeColumns`, `rowOverscan`, `columnOverscan`, `fixedRowHeightThreshold`, `queryWorkerThreshold`, `disableQueryWorker`, `showCheckbox`, `createRow`, `createDuplicate`, `editorPlugins`, `editors`, `onBeforeEdit`, `beforeEdit`, `onAfterEdit`, `afterEdit`, `onChangesChange`, `onSelectionChange`, `initialSelectedRowIds`, `rowProjection`, `cellAdornment`, `disableSorting`, `disableFiltering`, `canExportExcel`, `excelFileName`, `allowAddRootInContextMenu`, `allowAddRowInContextMenu`, `allowDuplicateRowInContextMenu`, `allowDeleteRowInContextMenu`, `deleteMenuDisabled`, `loading`, `treeContextMenu`); `F1GridColumn` (`field`, `headerName`, `headerGroup`, `form`, `search`, `getValue`, `onValueChange`, `width`, `flex`, `maxWidth`, `editable`, `type`, `format`, `decimalPlaces`, `options`, `userOptions`, `selectOptionIcon`, `required`, `min`, `max`, `validate`, `onOpenCodePicker`, `renderCell`, `getCellStyle`, `getCellProps`, `align`, `headerAlign`, `wrapText`, `mergeRows`, `headerCheckbox`, `hidden`, `pinned`, `selectOnFocus`, `syncWithTreeCheckbox`); `F1TreeProps` (`parentKey`, `treeColumn`, `treeCheckbox`, `defaultExpandAll`, `defaultExpanded`, `getRowOrder`, `onDeleteBlocked`, `onTreeCheckboxChange`, `isDeleteDisabled`); `F1GridRef` methods (`getSelectedRows`, `getSelectedRowIds`, `clearSelection`, `setSelectedRowIds`, `addRow`, `deleteSelectedRows`, `restoreDeletedRows`, `duplicateSelectedRows`, `getRows`, `getActiveRows`, `getChanges`, `validate`, `startEdit`, `stopEdit`, `setCellValue`); and `F1TreeRef` methods (`addChildRow`, `expandRow`, `collapseRow`, `expandAll`, `collapseAll`, `isExpanded`).

- [ ] **Step 2: Include supporting public type contracts in the same inventory assertion.** Require `F1GridRowId`, `F1GridRowState`, `F1GridEditorType`, `F1GridOption`, `F1GridUserOption`, `F1GridDraftValue`, `F1GridNumberFormat`, `F1GridFormMode`, `F1GridColumnFormOptions`, `F1GridColumnSearchOptions`, `F1GridRowFormContext`, `F1GridRowFormApplyContext`, `F1GridRowFormPlugin`, `F1GridEditContext`, `F1GridCellRenderContext`, `F1GridCellProps`, `F1GridEditLifecycle`, `F1GridEditorPlugin`, `F1GridChanges`, `F1GridSortDirection`, `F1GridSort`, `F1GridFilterOperator`, `F1GridFilter`, `F1GridPinSide`, `F1GridRowProjection`, `F1GridDataSourceQuery`, `F1GridDataSourceResult`, `F1GridDataSource`, and `F1GridContextMenuTreeConfig`. Include nested option members `F1GridOption.value/label`, `F1GridUserOption.value/label/avatarUrl/positionName/departmentName`, `F1GridColumnFormOptions.hidden/readOnly/label/group/order/span/multiple/targetField/targetLabel`, `F1GridColumnSearchOptions.hidden/label/group/order/span`, `F1GridRowFormPlugin.id/enabled/getTitle/getDescription/onBeforeApply`, `F1GridEditorPlugin.id/name/enabled/canEdit/createEditor/startEdit/endEdit`, `F1GridDataSource.pageSize/load`, `F1GridDataSourceQuery.offset/limit/sorts/filters/signal`, `F1GridDataSourceResult.rows/totalRowCount`, and `F1GridContextMenuTreeConfig.onAddRoot/onAddChild`. Also cover row-form/edit/cell-render context fields, cell props, change-set fields, sort/filter fields, row projection fields, and the allowed values of row state, editor type, number format, pin side, sort direction, and filter operator.

- [ ] **Step 3: Add failing navigation and search tests.** Assert the approved Korean group labels render, the active document is reachable from its group, and searching for an API identifier such as `queryWorkerThreshold` exposes a result that navigates to the corresponding API row.
- [ ] **Step 4: Add failing section-link and layout tests.** Assert that each document section has a stable heading target and that selecting a TOC link reaches that target; verify the left navigation and section TOC have accessible labels.
- [ ] **Step 5: Keep existing playground and clipboard assertions.** Preserve tests for editing, row form modal, tree, row merge, row height, large data, and code-copy interactions.
- [ ] **Step 6: Run the focused test to prove the new contract fails before implementation.**

Run from `frontend/`: `npm run test -- tests/f1-grid-docs.test.tsx`

Expected: FAIL for the newly required grouped navigation/API inventory/TOC behavior while existing baseline cases continue to identify regressions separately.

## Task 3: Add typed capability metadata and a complete API reference

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/types.ts`
- Modify: `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Test: `frontend/tests/f1-grid-docs.test.tsx`

- [ ] **Step 1: Extend document metadata.** Add a strongly typed navigation-group identifier to `F1GridDoc` and assign each document to one approved group. Keep the existing document IDs unless a navigation-only label requires a separate field.
- [ ] **Step 2: Rewrite capability titles and descriptions in Korean-first terminology.** Preserve source/API names in code and tables; merge duplicate explanations and assign existing playgrounds to their related feature pages.
- [ ] **Step 3: Complete the API reference from the Task 1 inventory.** For every public API name, include exact identifier, source type/signature, verified default where applicable, behavior/constraints, and a concise example or feature link. Group entries by owner rather than mixing grid, column, tree, plugin, and ref contracts.
- [ ] **Step 4: Complete feature coverage.** Ensure the feature pages explain data-source loading/errors, row/change state, editing types and validation, selection/clipboard, filters/sorts, column layout/persistence, row sizing, context actions/export, virtualization/query worker, tree expansion/checks, row merge, and plugin lifecycle to the extent each is supported by current implementation.
- [ ] **Step 5: Preserve important distinctions and aliases.** Explain `showCheckbox`, column `headerCheckbox`, and `treeCheckbox` independently; identify compatibility aliases such as `editors` and lifecycle aliases only where code confirms them.
- [ ] **Step 6: Update `F1-GRID.md`.** Replace stale portal organization or incomplete feature summaries that conflict with the new API inventory; retain unrelated grid-engine notes unchanged.
- [ ] **Step 7: Run the focused API inventory test.**

Run from `frontend/`: `npm run test -- tests/f1-grid-docs.test.tsx`

Expected: PASS for the complete public API name set; any undocumented identifier is reported by the focused assertion.

## Task 4: Implement grouped navigation, searchable API entries, and section anchors

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1GridDocsPage.tsx`
- Modify: `frontend/src/pages/f1-grid-docs/components/DocContent.tsx`
- Modify: `frontend/src/pages/f1-grid-docs/types.ts`
- Modify: `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`
- Test: `frontend/tests/f1-grid-docs.test.tsx`

- [ ] **Step 1: Render navigation by the typed capability groups.** Preserve deterministic order, selected-document state, and mobile close-on-selection behavior; show an accessible empty state when no search results match.
- [ ] **Step 2: Search document and API metadata.** Match normalized title, group, description, section heading/body, API identifier, type/signature, and option description. Selecting an API search result opens the API-reference document and scrolls to its stable row anchor.
- [ ] **Step 3: Give document sections stable IDs.** Generate IDs from section type and heading; generate API row IDs from section identity and option identifier so duplicate names in separate contracts remain unique.
- [ ] **Step 4: Render the right-side table of contents.** Build links from current document sections, keep links keyboard accessible, and synchronize active section during scroll without changing the existing route.
- [ ] **Step 5: Run navigation, search, and anchor tests.**

Run from `frontend/`: `npm run test -- tests/f1-grid-docs.test.tsx`

Expected: PASS for grouped labels, API identifier search, navigation to the specific API row, and section-link behavior.

## Task 5: Redesign the responsive three-column reader

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1GridDocsPage.css`
- Modify: `frontend/src/pages/f1-grid-docs/F1GridDocsPage.tsx`
- Modify: `frontend/src/pages/f1-grid-docs/components/DocContent.tsx`
- Modify: `frontend/src/pages/f1-grid-docs/components/DocCodeBlock.tsx` only if accessible copy feedback needs adjustment
- Test: `frontend/tests/f1-grid-docs.test.tsx`

- [ ] **Step 1: Implement desktop navigation, content, and TOC columns.** Use bounded side-column widths and a min-width-zero content column; keep the main document and wide tables scrollable within their own regions.
- [ ] **Step 2: Implement narrow layouts.** At tablet/mobile widths, collapse the navigation and TOC into accessible controls and prevent page-level horizontal overflow from API tables and playgrounds.
- [ ] **Step 3: Verify light and dark themes.** Apply the existing theme state to navigation, article, tables, code, TOC, and playground surfaces with readable contrast.
- [ ] **Step 4: Preserve clipboard behavior and keyboard access.** Keep code-copy feedback, navigation focus, search labels, and semantic heading hierarchy.
- [ ] **Step 5: Run the focused portal suite.**

Run from `frontend/`: `npm run test -- tests/f1-grid-docs.test.tsx`

Expected: PASS with no regressions in existing clipboard, search, modal, tree, editing, or playground checks.

## Task 6: Browser verification, build, and result artifacts

**Files:**
- Create: `docs/result/20261014/f1-grid-docs-overhaul/20261014_002_f1_grid_docs_overhaul_결과.md`
- Create: `docs/result/20261014/f1-grid-docs-overhaul/screenshots/` with desktop/mobile PNG captures
- Verify: `frontend/src/pages/f1-grid-docs/**`
- Verify: `frontend/tests/f1-grid-docs.test.tsx`

- [ ] **Step 1: Run focused documentation tests.**

Run from `frontend/`: `npm run test -- tests/f1-grid-docs.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run the frontend production build.**

Run from `frontend/`: `npm run build`

Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 3: Inspect the existing browser service before using port 4173.** Reuse the supplied S-ERP Vite server when it is responsive; do not start a second server on a different port if 4173 is occupied by another process.
- [ ] **Step 4: Verify browser behavior at 375px, 768px, and 1280px.** Check grouped navigation, searching by an API name, opening the correct section anchor, a representative interactive playground, no page-level horizontal overflow, and both themes.
- [ ] **Step 5: Save screenshots.** Capture at least one desktop and one mobile state under the result `screenshots` directory using lowercase English filenames.
- [ ] **Step 6: Write the result report.** Record scope, changed files, public API coverage evidence, test/build results, browser widths/themes, screenshot links, and any known unsupported API details without claiming unverified behavior.
- [ ] **Step 7: Review project status and diff.** Confirm only task-owned files changed; leave the pre-existing feed/notice edits and unrelated untracked documents untouched.

## Completion checklist

- [ ] Task direction and this dated plan exist.
- [ ] Detailed specification was written from this plan before implementation.
- [ ] Public user-facing API inventory is represented in the portal and verified by tests.
- [ ] Capability navigation, API search, stable anchors, responsive layout, themes, copy controls, and existing playgrounds work.
- [ ] Focused tests and production build pass.
- [ ] Browser verification and result screenshots/report are complete.
- [ ] No F1-Grid runtime, backend, or database behavior was changed.
