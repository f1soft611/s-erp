# F1-Grid Row Insertion Design

## Problem

F1-Grid's existing `행 추가` action appends a row to the end of the data sequence. In a long grid, users may need to insert a row next to a specific existing row and immediately edit it. A screen-wide start/end setting would not identify the intended insertion point, while changing the existing add action based on selection could make its behavior unpredictable.

## Approved Design

- Add `위에 행 삽입` and `아래에 행 삽입` actions to the regular F1Grid body context menu when it is opened on a row.
- Insert the new row immediately before or after the context-menu target in the grid's data sequence.
- After insertion, scroll the new row into view and focus its first editable cell, following the existing add-row editing behavior.
- Keep the existing `행 추가` action and `F1GridRef.addRow()` behavior unchanged: they continue appending a row.
- While any sort or filter is active, disable the relative-insertion actions and explain that sort/filter must be cleared first. Do not clear the user's sort or filter automatically.
- Leave F1Tree's root/child insertion behavior unchanged.

## Data Flow and Constraints

The context-menu target row ID is the anchor for the insertion action. The row insertion operation updates the grid's ordered row collection and its ID/index lookup state together, while marking the new row as inserted so existing change tracking continues to work.

Sort and filter state remain unchanged. Relative insertion is unavailable whenever either is active because the rendered ordering or membership could make the inserted row appear elsewhere or disappear from view. With neither active, the data sequence and displayed sequence agree, so insertion directly above or below the target is deterministic.

Virtualized grids must scroll far enough to render the newly inserted row before focusing it. Existing tree context-menu operations remain separate and are not affected by these actions.

## Verification

- Add focused tests for insertion before and after the context-menu target, inserted-row state/change tracking, and focus/scroll behavior.
- Verify insertion actions are unavailable while sort or filter state is active and become available after it is cleared.
- Verify existing append behavior through the context menu and `F1GridRef.addRow()` remains unchanged.
- Verify F1Tree still adds child/root rows using its existing behavior.
- Run the focused F1-Grid tests and frontend build.
- Update the F1-Grid behavior documentation and record regression coverage in the result documentation.

## Scope

The implementation is limited to the shared F1-Grid context menu and row-state insertion path, relevant tests, and F1-Grid documentation/results. It does not add a grid-wide position prop, alter append semantics, modify F1Tree ordering, or change user sort/filter state.
