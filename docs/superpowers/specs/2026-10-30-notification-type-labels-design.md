# Notification Type Labels Design

## Goal

Let users identify the kind of notification at a glance in the notification inbox list.

## Scope

- Add a compact text label to each notification row in the notification inbox page.
- Map `APPROVAL_COMMENT_MENTION` to `문서 멘션` and `DIRECT_MESSAGE_RECEIVED` to `새 쪽지`.
- Keep the existing title, summary, timestamp, read state, filtering, navigation, and popover behavior unchanged.
- Derive the label from the existing typed `eventType`; do not change API or database contracts.

## UI and implementation

Place a small, non-interactive category chip alongside the notification title. Keep the title truncatable and the label readable at narrow widths. Pass the label only from the notification inbox page so the shared inbox row and message inbox remain unchanged for other callers. The header popover is outside this request's scope.

## Alternatives

1. **Text chip derived from `eventType` (recommended):** clearly communicates the category, uses the existing response contract, and leaves notification content untouched.
2. Icon-only indicator: saves horizontal space but makes the category less explicit and requires icon meaning to be learned.
3. Prefix the title with category text: avoids a separate component but changes the title's content and may duplicate meaning.

## Validation

- Add focused tests covering both event-type labels in the notification inbox.
- Verify the existing inbox title, summary, navigation, and read behavior remain intact.
- Run the notification inbox Vitest suite and frontend build.
- Check the label and title at 375px and desktop width in the existing browser test flow; update the result record and screenshot if needed.
