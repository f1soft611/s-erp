# Search Result Notices and Unified Search Highlighting Design

## Goal

Make the document-status and sales-order-status result notices consistent and compact, announce successful result counts, and let users dismiss the notice without resetting their filters. In unified search, highlight matches in both the result title and its visible description.

## Design

Both status pages already render the shared `EmptySearchResultMessage` below their search controls and before their grids. Replace that empty-only presentation with a shared `SearchResultMessage` that receives the successful result count. It displays the existing no-results guidance when the count is zero and `조회 결과 총 N건입니다.` otherwise. Both variants use the same dismissible info/status Alert and compact vertical spacing (`py: 1`); the reset button is removed. The pages keep their existing success/loading/error gates, use document `totalRowCount` and sales `rows.length`, and mount the message only for a successful result. Closing it hides it until the next successful query, which naturally remounts it after the in-flight state.

Add a compact-spacing option to `PageMessageArea` so this change does not alter error messages elsewhere. Keep horizontal padding and existing responsive wrapping behavior.

`UnifiedSearchPage` already highlights case-insensitive matches in item titles with a React-rendered `<mark>`. Reuse the same renderer for item descriptions. This adds no API fields, HTML insertion, or search behavior changes.

## Alternatives

1. Implement independent notices in both status pages. Rejected because it duplicates copy, spacing, and dismiss behavior and can drift.
2. Change `PageMessageArea` spacing globally. Rejected because it would alter unrelated error alerts.
3. **Recommended:** extend the shared result notice and add an opt-in compact mode to the shared alert. This meets the visual consistency request while keeping unrelated alerts unchanged.

## Components and data flow

- `PageMessageArea` gains an opt-in compact vertical-spacing prop; defaults remain unchanged.
- `SearchResultMessage` formats a non-negative result count, provides `role="status"`, info severity, built-in close control, and no reset action.
- `DocumentStatusPage` passes `list.totalRowCount`; `SalesOrderStatusPage` passes `list.rows.length`, both only after the existing successful-load conditions.
- `UnifiedSearchPage` applies its existing safe `Highlight` renderer to both `item.title` and `item.description`.

## Error handling and accessibility

Result notices remain hidden during initial loading, subsequent loading, and list/default errors. The existing error `PageMessageArea` behavior is preserved. Result notices remain status announcements and use the Alert close control with its accessible label. Highlighted text stays in React text nodes; no HTML is parsed or inserted.

## Validation

Add focused component/page tests for zero and positive counts, dismiss and reappearance after a successful reload, and no display during loading or error. Extend unified-search tests for a match in the description while preserving unmatched text and case-insensitive title matching. Run related Vitest files and the frontend production build. Use synthetic data for 375px, 768px, and 1280px browser checks and capture the shared notices and highlighted result.
