# Unified Notifications and Direct Messages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver recipient-scoped in-app notifications for approval-comment mentions and new direct messages, with an independent one-to-one mailbox and synchronized notification/message read flows.

**Architecture:** Persist notifications as recipient-specific event rows, separate from direct-message threads and messages. Backend services derive the authenticated user and tenant, validate the resource/participant boundary, and create messages plus notifications transactionally. The React app keeps separate notification and message unread counts, with reusable header controls and separate inbox pages.

**Tech Stack:** Spring Boot/eGovFrame, MyBatis, PostgreSQL, React, TypeScript, MUI, React Router, Vitest, Testing Library, Maven.

---

## Task 1: Schema and migration documentation

**Files:**
- Create: `backend/DATABASE/20261030/20261030_005_create_notification_message_schema.sql`
- Create: `backend/DATABASE/20261030/20261030_005_change_notification_message_schema.md`
- Create: `backend/DATABASE/20261030/20261030_005_rollback.sql`
- Create matching files under `docs/database/20261030/`
- Modify: `docs/database/db-schema.md`
- Test: SQL constraint review; no database writes

- [ ] Confirm DB MCP metadata already collected in this task: public table catalog; `tb_user`, `tb_login_account`, `tb_common_comment`, approval main/line columns and constraints. Do not query row data.
- [ ] Add failing migration-level checks to review script object names, constraints, and indexes before implementation.
- [ ] Create `tb_notification`, `tb_direct_message_thread`, and `tb_direct_message` with tenant/user FKs, source-recipient dedupe, participant pair checks, thread-message FK, read timestamps, and inbox indexes described in `docs/spec/20261030/20261030_005_공통알림_쪽지함_통합_상세사양서.md`.
- [ ] Add rollback in dependency-reverse order: message, thread, notification.
- [ ] Record date, purpose, affected tables, impact, rollback, MCP metadata evidence, and that DB is not applied.
- [ ] Keep both date folders byte-identical and update the cumulative schema catalogue.
- [ ] Verify `git diff --check` and compare the mirrored SQL/change/rollback files.

## Task 2: Notification API

**Files:**
- Create: `backend/src/main/java/egovframework/let/groupware/notification/controller/NotificationApiController.java`
- Create: `backend/src/main/java/egovframework/let/groupware/notification/domain/model/NotificationVO.java`
- Create: `backend/src/main/java/egovframework/let/groupware/notification/domain/model/NotificationPageVO.java`
- Create: `backend/src/main/java/egovframework/let/groupware/notification/domain/repository/NotificationDAO.java`
- Create: `backend/src/main/java/egovframework/let/groupware/notification/service/NotificationService.java`
- Create: `backend/src/main/java/egovframework/let/groupware/notification/service/impl/NotificationServiceImpl.java`
- Create: `backend/src/main/resources/egovframework/mapper/let/groupware/notification/Notification_SQL_postgresql.xml`
- Modify: `backend/src/main/resources/egovframework/mapper/config/mapper-config.xml`
- Test: notification service/controller tests under `backend/src/test/java/egovframework/let/groupware/notification/`

- [ ] Write failing tests for summary, latest cursor page, own-notification read, idempotent repeat read, cross-user denial, and tenant filtering.
- [ ] Implement authenticated routes:
  - `GET /api/v1/groupware/notifications/summary`
  - `GET /api/v1/groupware/notifications?limit=&beforeNotificationId=&unreadOnly=`
  - `PUT /api/v1/groupware/notifications/{notificationId}/read`
- [ ] Resolve the authenticated `LoginVO` to the DB `tb_user.user_id` using tenant/login identity; never accept recipient identity in API filters or read bodies.
- [ ] Enforce `1 <= limit <= 50`; return typed source data, not a client-controlled URL.
- [ ] Insert event notifications through a service method requiring server-validated tenant, recipient, event/source IDs and display text. Duplicate source-recipient insert must not create a second alert.
- [ ] Run focused notification tests and confirm unauthorized IDs are not disclosed.

## Task 3: Direct-message backend

**Files:**
- Create message controller, service, repository, models and mapper under `backend/src/main/java/egovframework/let/groupware/message/`
- Create: `backend/src/main/resources/egovframework/mapper/let/groupware/message/DirectMessage_SQL_postgresql.xml`
- Modify mapper configuration
- Test: `backend/src/test/java/egovframework/let/groupware/message/`

- [ ] Write failing service tests for valid one-to-one send, inactive/cross-tenant/self recipient rejection, thread participant authorization, inbox/sent membership, and reply targeting.
- [ ] Implement summary, cursor-paged `INBOX`/`SENT` thread lists, new-thread send, detail read, explicit thread read, and reply routes from the detailed spec.
- [ ] Validate active recipient with `tb_user` and same-tenant active `tb_login_account`; map login identity to `user_id` only on the server.
- [ ] Validate subject length <= 120 and plain-text body length 1..5000 in service and request validation.
- [ ] Save new thread, message, and `DIRECT_MESSAGE_RECEIVED` notification in one Spring transaction.
- [ ] On reply, verify authenticated user is one of exactly two thread participants, derive the other participant as recipient, save the message, update thread timestamp, and create its notification in one transaction.
- [ ] Keep GET thread detail read-only. The explicit `POST /threads/{threadId}/read` updates only messages received by the actor and matching unread message notifications in one transaction.
- [ ] Return other-party read timestamps for sent messages without exposing unrelated message data.
- [ ] Run focused message tests and verify no database migration is applied in the local environment.

## Task 4: Approval comment mention backend

**Files:**
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/domain/model/DocumentApprovalCommentRequestVO.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/shared/controller/DocumentApprovalInteractionApiController.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/shared/service/DocumentApprovalInteractionService.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/shared/service/impl/DocumentApprovalInteractionServiceImpl.java`
- Test: approval interaction tests under existing approval test packages

- [ ] Write failing tests for duplicate mention IDs, self mention exclusion, unauthorized document target, invalid/inactive user, and `mentionAll` audience expansion.
- [ ] Add `mentionedUserIds` and `mentionAll` to the create-comment request; retain current HTML content and parent comment contract.
- [ ] Add a server audience lookup for document access using existing approval permission services/queries and active same-tenant users.
- [ ] For `mentionAll`, compute the audience server-side; union it with explicitly selected mention users; remove duplicates and author.
- [ ] Insert the existing user comment and all resulting `APPROVAL_COMMENT_MENTION` events transactionally.
- [ ] Keep comment updates from re-sending notifications.
- [ ] Run focused approval interaction tests and the existing comment/approval regression tests.

## Task 5: Frontend notification infrastructure and screens

**Files:**
- Create: `frontend/src/shared/services/notificationService.ts`
- Create: `frontend/src/shared/types/notification.types.ts`
- Modify: `frontend/src/pages/dashboard/DashboardPage.tsx`
- Create: `frontend/src/pages/groupware/notifications/NotificationInboxPage.tsx`
- Create focused notification list/popover components under `frontend/src/pages/groupware/notifications/components/`
- Modify: `frontend/src/routes/AppRouter.tsx` and dashboard content route mapping
- Test: `frontend/tests/notification-inbox.test.tsx`

- [ ] Write tests for badge display/`99+`, latest five items, open-without-read, click/read/navigation, failure preserving unread, pagination, empty and error states.
- [ ] Implement API services with explicit response types and no success-shaped fallback for failed requests.
- [ ] Fetch unread summary after protected-app initialization and on document visibility restoration; refresh summary and the latest-five list when the popover opens.
- [ ] Render the existing bell control with MUI badge and a responsive popover. More navigates to the inbox.
- [ ] Read notification when selected, then route from the typed source. If read fails, surface an error and continue source navigation without changing local unread state.
- [ ] Implement all/unread inbox tabs with cursor paging and explicit loading/empty/error/retry states.
- [ ] Run the notification frontend test file.

## Task 6: Frontend message inbox

**Files:**
- Create: `frontend/src/pages/groupware/messages/MessageInboxPage.tsx`
- Create message services/types/components under `frontend/src/pages/groupware/messages/`
- Modify: `frontend/src/pages/dashboard/DashboardPage.tsx`
- Modify protected route/content mapping
- Test: `frontend/tests/message-inbox.test.tsx`

- [ ] Write tests for inbox/sent tabs, unread count, active tenant recipient selection, new-message subject/body validation, thread read synchronization, reply, and API error states.
- [ ] Add a message header control with a separate unread-message badge; clicking it navigates to the message inbox.
- [ ] Implement received/sent cursor thread lists and selected thread detail. At <= 767px, replace list with the selected conversation and a back-to-list action; at wider viewports use a two-pane layout.
- [ ] Add a compose flow with exactly one active same-tenant recipient, optional subject <= 120 chars, plain-text body <= 5000 chars, and explicit sending/error state.
- [ ] After loading a thread, call the read endpoint and refresh the separate message count and notification state.
- [ ] Render message body as escaped React text only.
- [ ] Run the message frontend tests.

## Task 7: Comment mention UX

**Files:**
- Modify: `frontend/src/shared/components/feed/TiptapCommentThread.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/services/documentApproval.service.ts`
- Modify: `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`
- Test: document approval feed tests

- [ ] Write a failing test that selects a named user after typing `@` and verifies `mentionedUserIds` is sent separately from HTML content.
- [ ] Add an opt-in mention configuration to the shared Tiptap comment component; leave notice comment callers unchanged.
- [ ] Query the existing active tenant user-option source, provide keyboard/mouse selection and an `@ALL` option, and retain selected user IDs separately from visible labels.
- [ ] Pass IDs and `mentionAll` on new comment/reply submission only. Edit retains the original no-re-notification contract.
- [ ] Preserve selection/input on submit failure and expose the existing error feedback.
- [ ] Run document comment/approval and notice comment regression tests.

## Task 8: Final validation and result

**Files:**
- Create: `docs/result/20261030/unified-notifications-messages/README.md`
- Create screenshots: `docs/result/20261030/unified-notifications-messages/screenshots/`

- [ ] Run `mvn -f backend/pom.xml test`.
- [ ] Run focused frontend tests, then `npm run build`.
- [ ] Confirm unrelated pre-existing modifications remain untouched.
- [ ] Check whether port 4173 is already used; reuse only a verified S-ERP server or start `npm run dev -- --strictPort`. Do not switch ports. Stop only the server started for this check.
- [ ] Verify the notification popover, notification inbox, direct-message list/detail, and mention chooser at 375px, 768px and 1280px. Save readable screenshots in the result screenshots directory.
- [ ] Record test commands/results, screenshots, migration filenames, DB MCP metadata tables inspected, and explicitly state that migrations were not applied.
- [ ] Review exact task scope and run `git diff --check`.
