# Community Archive F1Tree Context Menu Design

## Goal

Remove the root-add action from the community archive tree context menu and make Excel export available there.

## Approved design

Configure only the archive `F1Tree` instance in `ArchiveFileGrid`:

- Set `allowAddRootInContextMenu={false}` so the tree context menu does not offer `루트 추가`.
- Enable `canExportExcel` so `엑셀 내보내기` exports the currently displayed tree rows and visible columns using the existing shared F1Grid exporter.
- Keep row add, row delete, and duplicate actions disabled; preserve all other shared context-menu actions and F1Tree defaults.
- Do not change shared F1Grid/F1Tree defaults or other screens.

## Follow-up: separator grouping

The archive menu can have no row-add, root-add, duplicate, or delete actions. Render separators only between non-empty menu groups so there is a single separator between the general actions and the reset action when both row actions and sort/filter actions are absent. Keep distinct separators when row-action and sort/filter groups are present.

## Verification

- Add a page-level regression test that opens the archive tree context menu, confirms `루트 추가` is absent and `엑셀 내보내기` is present, and exercises export through the existing exporter behavior.
- Run the focused archive page tests and frontend production build.
- Update the archive F1-Grid documentation and dated result documentation.
- Add shared context-menu regression coverage for the no-row-actions tree and verify it renders one separator.
