# Document Pin Confirmation and Action Placement Design

## Goal

Require the notice-style confirmation dialog before any document pin or unpin
request, and place pin actions consistently in list, feed, and detail views.

## Approved behavior

- Pin and unpin both require confirmation. Cancel closes the dialog without
  calling an API; confirm calls the existing pin/unpin API.
- Use the notice confirmation pattern and labels: action title, `취소`, and
  `확인`. Document-specific descriptions are:
  - Pin: `이 문서를 상단에 고정하시겠습니까?`
  - Unpin: `이 문서의 상단 고정을 해제하시겠습니까?`
- After success, retain the current quiet refresh of the pinned and ordinary
  document lists. Existing error notifications remain in place.
- List view: place the pin icon immediately beside the document-kind chip.
- Feed view: order the document toolbar as status, document kind, divider, pin,
  and `더보기`; place the pin icon immediately before the `더보기` control.
- Document detail overlay: use the same toolbar order and reflect the selected
  document's current pin state.
- The unpin action in the pinned-items panel also uses the same confirmation.

## Current implementation findings

- `DocumentWritePage` currently starts pin/unpin immediately from list and
  pinned-panel icon handlers.
- `DocumentApprovalDetailFeed` currently starts pin/unpin immediately in feed
  presentation; its panel presentation does not receive a pin state.
- `DocumentApprovalToolbar` accepts `pinControl` but does not render it.
- `ListView` currently renders `renderItemAction` in the author/date row, while
  the document kind chip is in the title row.
- `CommunityNoticePage` uses `UnsavedChangesConfirmDialog` before invoking its
  pin mutation.

## Design

Use one pending pin-action state and one confirmation dialog in
`DocumentWritePage`. Every list, feed, detail, and pinned-panel action requests
confirmation through that page-level handler, carrying the document ID,
current pinned state, and title. Confirming invokes the existing `togglePin`;
canceling clears the pending action. The handler catches and reports mutation
errors with the existing notification context.

Add an optional header-action render prop to `ListView`, rendered adjacent to
the category chip. Keep this action and metadata actions outside the row's
content button so the DOM contains no nested interactive buttons. Use the
header slot for the document list pin button and remove the document pin button
from the author/date row. Render `pinControl` in
`DocumentApprovalToolbar` immediately next to `moreMenu`. Extend the detail
component's shared props with the selected document's pin state and use the
same control in panel and feed presentations. The page resolves panel pin state
from its current pinned document collection.

No API, database, pagination, or non-document page behavior changes are
included.

## Error and loading behavior

- A pending mutation disables the corresponding pin control.
- Cancel never calls the mutation API.
- Confirm closes the confirmation dialog and starts the existing async mutation.
- Successful pin/unpin quietly refreshes the pinned and ordinary lists.
- Mutation failures are surfaced through the existing error notification.

## Validation

- Component tests verify pin controls are adjacent to the document kind and
  `더보기` controls in list/feed/detail presentations.
- Page tests verify cancel does not call pin/unpin APIs, confirmation calls the
  correct API exactly once, the action-specific confirmation copy is shown,
  and the pinned-panel unpin also requires confirmation.
- Run focused frontend tests and `npm run build`.
- Verify the resulting layouts in the existing S-ERP browser at 375px, 768px,
  and 1280px, and save screenshots under
  `docs/result/20261021/document-pin-confirmation-actions/screenshots`.
