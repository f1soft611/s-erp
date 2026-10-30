# Notification Type Labels Design

## Goal

Let users identify the kind of notification at a glance in the notification inbox list.

## Scope

- Add a compact category icon to each notification row in the notification inbox page.
- Map `APPROVAL_COMMENT_MENTION` to `문서 멘션` and `DIRECT_MESSAGE_RECEIVED` to `새 쪽지`.
- Add an inbox category filter for all notifications, document mentions, or new messages.
- Allow users to hide one notification and bulk-hide read notifications; hiding is per-recipient soft archiving, not deletion of the source business event.
- Keep the existing title, summary, timestamp, read state, filtering, navigation, and popover behavior unchanged.
- Derive the label from the existing typed `eventType`; extend the list API with an optional event-type query parameter so filtering works across cursor pages.
- Add nullable `archived_at` to `tb_notification`; do not physically delete notification or source rows.

## UI and implementation

Place a non-interactive type icon in the first, fixed-width column of each notification row, like the icon/content separation in the document list view. It must precede the unread indicator and title rather than sit beside the title. Use a document icon for mentions and an envelope icon for new messages; expose the category name through a tooltip and accessible label. Keep the title truncatable. Pass the indicator only from the notification inbox page so other list callers remain unchanged.

Keep the existing read-state filter and add a separate category toggle group with all, document-mention, and new-message options. Send the selected event type as an optional query parameter to the notification list API; the backend validates it against the two supported event types and applies it before cursor pagination. The user can hide any one of their notifications; a separate confirmation action bulk-hides only read notifications within the selected category (or all categories). Archived notifications are excluded from lists and unread counts. The header popover is outside this request's scope.

## Alternatives

1. **Leading type icon, server-side category filter, and per-user soft archive (recommended):** follows the established document list layout, distinguishes categories without changing notification titles, and lets users clean up without deleting source records or losing deduplication history.
2. Text chip beside the title: communicates the category explicitly but places the indicator in the title area and consumes more horizontal space.
3. Filter only the currently loaded page or physically delete notification rows: the first gives incomplete results across pages; the second can allow a retried event to recreate a dismissed notification and permanently removes recipient-level history.

## Validation

- Add focused tests covering both accessible type indicators, category-filter requests, individual archiving, and bulk archiving only read items within a selected category.
- Verify backend ownership/tenant scoping, unsupported type rejection, archived-row exclusion, and bulk archive eligibility.
- Verify the existing inbox title, summary, navigation, and read behavior remain intact.
- Run notification inbox and backend notification service tests, plus the frontend build and browser viewport checks.
- Check the leading icon and title at 375px and desktop width in the existing browser test flow; update the result record and screenshot if needed.
