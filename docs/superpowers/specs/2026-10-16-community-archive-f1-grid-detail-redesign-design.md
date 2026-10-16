# Community Archive F1-Grid and Detail Redesign

## Status

Design approved by the user on 2026-10-16. The user-requested scope is limited to the community archive page at `/groupware/community/archive`; the earlier discussion about the notice page was explicitly corrected and is not part of this work. The user approved the page structure, search behavior, detail layout, and validation scope described below.

## Goal

Align the community archive page with the ERP's established management-page and feed-detail patterns:

- Use the draft-form-management page structure and F1-Grid for the archive list.
- Keep one integrated search field and move the archive category filter into F1-Grid-backed detailed search.
- Open a full-height right-side detail overlay when the user selects a post title.
- Present detail as a feed-style top metadata/action area, a plain-text body, and the shared attachment-list design.

## Existing constraints

- The archive page already has a dedicated list/detail/composer flow, archive-specific APIs, category loading, mutation hooks, and administrator permission checks.
- `fetchArchivePosts` already accepts the integrated `keyword` and `categoryCode`, along with `pageIndex` and `pageUnit`; keyword search currently covers title, content, and author.
- The API does not expose separate author or date filters. Do not add API or backend changes to this UI redesign.
- `F1Grid` supports a paged `dataSource`; its detailed search fields can be derived from column `search` metadata through the common `PageSearchArea` contract.
- `PostDetailPanel`, `PageAreaOverlay`, `FeedCard`, and `AttachmentList` are existing shared UI patterns. Approval-specific detail behavior is not applicable to archive posts.
- The archive board's existing tenant isolation, authenticated download, and administrator authorization contracts remain unchanged.

## Approved page design

### Page shell and search

Compose the page using the same order as draft-form management:

`PageHeader → PageSearchArea → PageMessageArea → F1-Grid`

The search area has one integrated text input. Keep its established keyword scope (title, body, author). Detailed search has the active archive category only, sourced from the existing common-code category API; do not add author/date filters or hard-code category names.

### F1-Grid list

Replace the current HTML table and separate table paginator with F1-Grid. Show title, category, author, registered date, and attachment count. Clicking the title opens the selected post detail; other cell interactions must not accidentally open it.

Adapt F1-Grid `offset`/`limit` to the existing API's `pageIndex`/`pageUnit` and return its total row count. Apply integrated keyword and detailed category values to the existing API parameters. Preserve the API's newest-first order by disabling grid sorting. Reapply a changed search from the first page. Preserve loading, retry, and error feedback.

### Full-height detail overlay

Selecting a title loads the existing detail API and opens the existing full-height right-side `PageAreaOverlay`/`PostDetailPanel`, keeping the list behind it. The detail content follows the same three-part visual hierarchy as notice and document feed details:

1. **Top area:** author identity and date metadata, category chip, and a more-actions menu. The menu contains edit/delete only when the user's existing permissions allow those actions. Keep the title within this top content area, before the body.
2. **Body:** render the archive's existing plain-text `contents` with preserved line breaks and safe wrapping. Do not introduce a rich-text editor or render content as HTML.
3. **Attachments:** render individual files with the existing shared `AttachmentList` view design and per-file authenticated download actions.

Keep the overlay close and independent scrolling behavior. Preserve the existing delete confirmation, loading and detail retry behavior, and download error notification.

## Approaches considered

1. **Adapt archive-specific detail using shared feed primitives (selected).** Reuse the overlay shell, feed-style metadata/action hierarchy, and shared attachment list without coupling archive behavior to approval-specific UI. This matches the requested pattern while keeping changes bounded.
2. **Reuse the document-approval detail component directly.** Rejected because approval statuses, actions, permissions, and comment workflows are unrelated to archive posts and would add unnecessary coupling.
3. **Keep the current archive detail and make only cosmetic changes.** Rejected because it would retain the separate HTML table and current detail structure rather than achieving the requested page pattern.

## Scope boundaries

Included:

- `ArchiveBoardPage` layout/search integration.
- Replacing the archive HTML table with an F1-Grid and connecting server paging/search.
- Archive detail visual hierarchy, more-actions menu placement, and shared attachment-list display.
- Focused regression coverage, build verification, responsive browser verification, and dated result documentation.

Excluded:

- Notice-page changes.
- Backend, API, database, or data-model changes.
- New author/date search contracts.
- Changes to create/edit form fields, upload behavior, tenant scoping, or permission policy.
- Changes to shared F1-Grid behavior or approval/document workflow behavior.

## Error and permission behavior

- Preserve actionable list/category/detail retry states; do not convert failures to successful empty results.
- Keep existing notification behavior for mutation and file-download failures.
- Continue to rely on server-side authorization. Hide edit/delete menu entries when the current page permissions do not allow them.
- Do not change existing tenant isolation or attachment ownership checks.

## Verification plan

- Focused frontend tests verify the management-page shell, single integrated search, category detailed search, F1-Grid columns and paged API requests, title selection, overlay layout, permission-gated more-actions, plain-text line breaks, shared attachments, and individual downloads.
- Preserve existing archive composer, service, and mutation tests.
- Run the smallest relevant Vitest selection, `npm run build`, and `git diff --check`.
- Verify browser layout at 375px, 768px, and 1280px, including grid overflow, overlay width/height, internal scrolling, and attachment actions.
- Record results and available screenshots under `docs/result/20261016/community-archive-grid-detail/`.
