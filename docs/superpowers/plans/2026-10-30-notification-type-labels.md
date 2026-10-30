# Notification Categories and Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Identify notification categories with leading icons, filter by category, and let users hide notifications without deleting source records.

**Architecture:** Derive leading category icons and accessible labels from the existing event type, add a validated event-type filter to the paginated list API, and store per-recipient soft-archive state in `tb_notification.archived_at`. Bulk archive is limited to read notifications and the currently selected category; notification source records are never deleted.

**Tech Stack:** React, TypeScript, MUI, Spring Boot/eGovFrame, MyBatis, PostgreSQL, Vitest, Testing Library, Playwright.

---

## Files

- Modify `frontend/src/pages/groupware/notifications/NotificationInboxPage.tsx` for type/read filters, leading category icons, individual hide, and confirmed bulk cleanup.
- Modify `frontend/src/pages/groupware/shared/components/InboxPageLayout.tsx` for an optional accessible category icon and separate row action.
- Modify `frontend/src/shared/types/notification.types.ts` and `frontend/src/shared/services/notificationService.ts` for event-type query and archive APIs.
- Modify backend notification controller, service, DAO, and mapper to validate filters, exclude archived rows, and perform owner-scoped archive updates.
- Extend `backend/src/test/java/egovframework/let/groupware/notification/service/impl/NotificationServiceImplTest.java`.
- Extend/create frontend notification inbox and service tests.
- Add identical migration, rollback, and change record pairs for `20261030_008` under `backend/DATABASE/20261030/` and `docs/database/20261030/`; update `docs/database/db-schema.md`.
- Create dated direction/plan/spec documents at `docs/directions/20261030/20261030_007_알림구분표시_작업지시서.md`, `docs/plan/20261030/20261030_007_알림구분표시_계획서.md`, and `docs/spec/20261030/20261030_007_알림구분표시_상세사양서.md`.
- Update `frontend/tests/notification-message-screenshots.browser.mjs` fixture/assertions; save screenshots and results under `docs/result/20261030/notification-type-labels/`.

## Task 1: Add failing contract tests

**Files:** `frontend/tests/notification-inbox.test.tsx`, `frontend/tests/notification-service.test.ts`, and `backend/src/test/java/egovframework/let/groupware/notification/service/impl/NotificationServiceImplTest.java`.

- [x] Add frontend fixtures for both notification event types. Test accessible icons named `문서 멘션` and `새 쪽지` appear before each title, unchanged summaries, selecting each type filter, and retaining the read filter when changing type.
- [x] Test individual archive removes only the chosen row and bulk archive sends the selected event type; disable the bulk action in the unread filter.
- [x] Test service URLs/payloads include optional eventType, `PUT /{id}/archive`, and `PUT /archive-read`.
- [x] Add backend tests that valid event types are forwarded to the DAO, invalid non-null types return 400 before querying, and archive requests include authenticated tenant/user. Bulk archive passes optional type and only targets read rows through the archive query contract.
- [x] Run focused frontend notification and backend service/mapper tests.
- [x] Confirm category/filter/archive behavior with regression tests.

## Task 2: Implement category UI and API filtering

**Files:** `NotificationInboxPage.tsx`, `InboxPageLayout.tsx`, `notification.types.ts`, `notificationService.ts`, backend notification controller/service/mapper.

- [x] Define a total `Record<NotificationEventType, { label: string; icon: ReactNode }>` mapping using `DescriptionOutlined` for mentions and `MailOutlineOutlined` for new messages.
- [x] Add an optional category indicator prop to `InboxListItem`; render its icon in a dedicated first column before the unread dot and text content, matching the document list view, with tooltip and accessible label. Keep the title in a `minWidth: 0`, ellipsized flex child.
- [x] Add independent read-state and event-type filters. Send an omitted eventType for all types, otherwise pass the selected event type on every page request.
- [x] Add optional `eventType` to the backend list endpoint/service signature. Validate only the two supported event types; reject unsupported values with HTTP 400 before DAO calls.
- [x] Add the MyBatis condition `AND n.event_type = #{eventType}` before cursor/order/limit while preserving tenant and recipient predicates.
- [x] Run focused frontend and backend notification tests; confirm both category controls work together and cursor pagination requests retain filters.

## Task 3: Implement soft archive and schema history

**Files:** backend notification controller/service/DAO/mapper; frontend notification service/page/center; migration/schema docs.

- [x] Add nullable `archived_at TIMESTAMP` to `tb_notification`. Add partial indexes for active pages and active unread counts.
- [x] Exclude archived rows from list and unread-summary queries. Keep normal read marking scoped to active notifications.
- [x] Add idempotent `PUT /{notificationId}/archive`, updating only the authenticated user's tenant/recipient row; return 404 for another user's or nonexistent ID.
- [x] Add `PUT /archive-read?eventType=...`, updating only rows with `read_at IS NOT NULL`, optionally restricted to the validated event type, and return the affected-row count.
- [x] Add a per-row `목록에서 숨기기` action. Keep it separate from the row navigation button and refresh the unread summary after a successful archive.
- [x] Add a `읽은 알림 정리` confirmation dialog. Apply the currently selected type filter; disable while `읽지 않음` is selected; on success reload the list and report the archived count.
- [x] Create migration `20261030_008` to add `archived_at` and partial indexes. Create matching rollback and change record in both DB folders. Rollback drops the indexes/column and restores archived notifications to visibility; never execute either script against MCP.
- [x] Update `docs/database/db-schema.md` and record that default MCP `list_tables` and `describe_table(tb_notification)` confirmed the table and existing event/read columns but no `archived_at`; no row data was queried.
- [x] Run backend service tests and focused frontend tests; verify active list, unread summary, owner scope, idempotency, and read-only bulk conditions.

## Task 4: Browser validation and results

**Files:** `frontend/tests/notification-message-screenshots.browser.mjs`, `docs/result/20261030/notification-type-labels/`.

- [x] Extend the existing browser fixture with both event types and verify leading category icons, separate filters, and archive controls at 375px, 768px, and 1280px.
- [x] Run the existing browser suite at `http://127.0.0.1:4173`; save captures only under the new result folder.
- [x] Confirm no horizontal overflow, icons remain before titles, and the bulk confirmation/action remains usable at narrow widths.
- [x] Run focused frontend/backend tests and `git diff --check`.
- [x] Complete `npm run build` successfully.
- [x] Record exact outcomes, MCP metadata evidence, migration-not-applied status, and screenshot paths in the result README.
