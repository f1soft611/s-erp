# Groupware Profile Avatar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show saved profile images in existing document and notice profile/avatar locations while preserving each location's current name/initial fallback when the image is missing or fails.

**Architecture:** Add a small shared wrapper around MUI `Avatar` that accepts a caller-provided fallback. Add nullable profile-image properties to existing document, notice, and common-comment read models where the image is not currently returned, using tenant-scoped joins to existing account data. Connect the fields through current adapters and renderers; do not add profile UI to plain-text-only places or change approval status seals.

**Tech Stack:** React, TypeScript, MUI, Vitest, Spring Boot, MyBatis, PostgreSQL read-only MCP.

---

## File Map

- Create `frontend/src/shared/components/ProfileAvatar.tsx`: typed MUI Avatar wrapper with optional image URL and required existing fallback content.
- Create `frontend/tests/profile-avatar.test.tsx`: image, missing-image, and image-error behavior.
- Modify `frontend/src/shared/components/feed/FeedCard.tsx`: allow optional `authorProfileImageUrl` without changing the author name or card layout.
- Modify `frontend/src/shared/components/feed/TiptapCommentThread.tsx`: pass optional `authorProfileImageUrl` on comments and system-event actor items to the avatar while retaining the current fallback, badges, and read-only controls.
- Modify notice types and `noticePostAdapter.ts`: carry `writerProfileImage` from API records to `NoticeFeedList` and map comment `writerProfileImage` to the feed comment's `authorProfileImageUrl`.
- Modify `frontend/src/shared/services/commonContentApi.ts` and `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`: carry `writerProfileImage?: string | null` in common and document comment read types.
- Modify `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`: use the shared avatar for the post author.
- Modify `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts` and the document detail read adapter/types: carry the drafter image and existing participant images.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`: use the shared avatar for people (drafter, comments, agreement/reference participants); keep status seals as MUI `Avatar`.
- Modify `backend/src/main/java/egovframework/let/groupware/community/notice/domain/model/NoticeBoardPostVO.java` and `backend/src/main/resources/egovframework/mapper/let/groupware/community/notice/NoticeBoard_SQL_postgresql.xml`: return nullable post-writer image on list and detail reads.
- Modify `backend/src/main/java/egovframework/com/common/domain/model/CommonCommentVO.java` and `backend/src/main/resources/egovframework/mapper/com/common/CommonComment_SQL_postgresql.xml`: return nullable writer image on comment and system-event reads, including mixed streams and cursors; retain event filtering and ordering.
- Modify `backend/src/main/java/egovframework/let/groupware/approval/domain/model/DocumentApprovalDetailVO.java`, `DocumentApprovalFeedItemVO.java`, `DocumentApprovalWriteServiceImpl.java`, and `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml`: return nullable drafter image on detail reads and copy it into assembled feed items.
- Extend existing notice/approval mapper tests and add a common-comment mapper test only if the current test suite lacks one.

## Task 1: Confirm database contract and backend response paths

**Files:** no edits until DB and response paths are confirmed.

- [ ] **Step 1: Read DB schema through the registered read-only MCP.**

  Use `list_tables`, then `describe_table` for `tb_user`, `tb_login_account`, `tb_board_post`, `tb_common_comment`, and the electronic approval main table. Confirm the image column, tenant keys, and ID linkage; do not read tenant data rows.

- [ ] **Step 2: Trace all required read paths.**

  Confirm notice list/detail SQL, notice comment list/page SQL, approval detail/feed SQL, and approval comment page SQL. If approval comments use the shared common-comment mapper, keep their current contract; if they use another mapper, extend only that actual response path.

- [ ] **Step 3: Record the verified contract.**

  `tb_login_account` has nullable `profile_image`, `login_code`, `login_id`, and `tenant_id`; `tb_user` has `user_id`, `login_id`, and `tenant_id`. Notice and common-comment controllers pass `LoginVO.getId()` as their writer ID, and document access passes the same value as `drafterId`; approval participant lookup separately uses `getUniqId()`. Record that post/comment/drafter image joins use tenant plus login code, while the existing participant-image join uses tenant-scoped user ID and login ID. Update the detailed feature spec before changing Java or SQL.

## Task 2: Add backend profile-image response fields with tests first

**Files:**
- Modify `backend/src/test/java/egovframework/let/groupware/community/notice/mapper/NoticeBoardTenantScopeMapperTest.java`.
- Modify `backend/src/test/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalMapperTest.java`.
- Extend `backend/src/test/java/egovframework/com/common/service/CommonCommentServiceTest.java` or add a dedicated mapper test following the existing MyBatis mapper-test pattern.
- Modify the corresponding VO and mapper files in the File Map.

- [ ] **Step 1: Add failing mapper assertions.**

  Assert that notice list and detail map `writerProfileImage`, comment list/page/read-by-ID map `writerProfileImage`, and approval detail/feed map `drafterProfileImage`. Assert every profile join is tenant-scoped and LEFT JOINs preserve the post/comment/document row. Keep participant profile-image assertions already present.

- [ ] **Step 2: Run focused mapper tests and confirm the new assertions fail.**

  Run from `backend`:

  ```powershell
  mvn "-Dtest=NoticeBoardTenantScopeMapperTest,DocumentApprovalMapperTest,CommonCommentServiceTest" test
  ```

  Expected before implementation: failing assertions for missing profile-image mappings/columns, not compilation or environment failures.

- [ ] **Step 3: Add optional nullable model properties.**

  Add `writerProfileImage` to `NoticeBoardPostVO` and `CommonCommentVO`; add `drafterProfileImage` to `DocumentApprovalDetailVO` and `DocumentApprovalFeedItemVO`. Match existing Java accessor and JSON naming patterns. Do not add image fields to write requests.

- [ ] **Step 4: Add tenant-scoped image projections to existing reads.**

  Join `tb_login_account` on verified tenant and `login_code` for notice `writer_id`, comment `writer_id`, and approval `drafter_id`; keep the existing tenant-scoped `tb_user` to account join for approval-line participants. Select the nullable image under the matching snake-case alias and add the result-map mapping. Include common-comment read-by-ID queries so create/update responses return the same image as list responses. Keep existing filters, pagination, order, tenant predicates, response envelope, detail authorization, and row preservation unchanged. Include system-event actor images following the user's approved follow-up; deleted rows continue to return null images.

- [ ] **Step 5: Re-run focused backend tests.**

  ```powershell
  mvn "-Dtest=NoticeBoardTenantScopeMapperTest,DocumentApprovalMapperTest,CommonCommentServiceTest" test
  ```

  Expected: `BUILD SUCCESS` with all selected tests passing. If a selected class name does not match an existing test, use the actual existing test class and keep the focused set equivalent.

## Task 3: Implement and test the shared avatar component

**Files:**
- Create `frontend/src/shared/components/ProfileAvatar.tsx`.
- Create `frontend/tests/profile-avatar.test.tsx`.

- [ ] **Step 1: Add failing behavior tests.**

  Use existing Vitest/Testing Library conventions to assert that (a) `imageUrl` becomes the avatar image `src`, (b) null/empty URL renders caller fallback text, and (c) an image error hides the image and renders caller fallback. Example component contract:

  ```tsx
  <ProfileAvatar
    name="홍길동"
    imageUrl={imageUrl}
    fallback="홍"
    sx={{ width: 36, height: 36 }}
  />
  ```

- [ ] **Step 2: Run the new test and confirm it fails because `ProfileAvatar` is not implemented.**

  From `frontend`:

  ```powershell
  npm run test -- tests/profile-avatar.test.tsx
  ```

- [ ] **Step 3: Implement the smallest typed MUI wrapper.**

  Accept `name`, nullable `imageUrl`, and required `fallback: ReactNode`, plus the remaining MUI `Avatar` props except caller-owned `alt`, `src`, and `children`. Pass `alt={name}`, `src={imageUrl || undefined}`, children `{fallback}`, and forward the other props. MUI Avatar should provide its normal fallback when the image fails.

- [ ] **Step 4: Run the component tests and confirm all three cases pass.**

  ```powershell
  npm run test -- tests/profile-avatar.test.tsx
  ```

## Task 4: Wire profile data to existing notice and comment displays

**Files:**
- Modify `frontend/src/shared/components/feed/FeedCard.tsx`.
- Modify `frontend/src/shared/components/feed/TiptapCommentThread.tsx` and `frontend/src/shared/components/feed/CommentThread.tsx` only if the exported item type requires it.
- Modify `frontend/src/shared/services/commonContentApi.ts` for the shared comment API response field.
- Modify `frontend/src/pages/groupware/community/notice/types/community.types.ts`.
- Modify `frontend/src/pages/groupware/community/notice/data/noticePostAdapter.ts`.
- Modify `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`.
- Extend `frontend/tests/feed-components.test.tsx`, `frontend/tests/notice-page.test.tsx`, and `frontend/tests/notice-login-popup.test.tsx` only for affected render paths.

- [ ] **Step 1: Add failing tests for the data path and render behavior.**

  Assert notice post/comment API `writerProfileImage` reaches the card/comment avatar, the image is rendered when present, and current fallback remains for null/failed image. Assert deleted comments do not use a profile image; system events use only their actual actor image.

- [ ] **Step 2: Run the focused notice/feed tests and confirm the new assertions fail.**

  ```powershell
  npm run test -- tests/feed-components.test.tsx tests/notice-page.test.tsx tests/notice-login-popup.test.tsx
  ```

- [ ] **Step 3: Extend frontend API/domain types and adapters.**

  Add optional nullable `writerProfileImage` fields to the notice post/comment API and domain types. Map the post value to `authorProfileImageUrl` on the card and comment/event values to `authorProfileImageUrl` on comment items. In `TiptapCommentThread`, render `ProfileAvatar` for comments and system-event actors, preserving the current two-character fallback and event author/time/badge/read-only behavior.

- [ ] **Step 4: Run focused notice/feed tests and confirm they pass.**

  ```powershell
  npm run test -- tests/feed-components.test.tsx tests/notice-page.test.tsx tests/notice-login-popup.test.tsx
  ```

## Task 5: Wire document author, comment, and participant displays

**Files:**
- Modify `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`.
- Add the nullable author-image property to `DocumentApprovalComment` in `documentWrite.types.ts`.
- Modify the document response mapper/service only if it currently transforms detail/feed data.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`.
- Extend `frontend/tests/document-write-page.test.tsx` and `frontend/tests/document-feed-item.test.tsx`.

- [ ] **Step 1: Add failing assertions for drafter and participant image handling.**

  Cover drafter image `src`, existing participant image `src`, and the existing drafter/participant fallback when image values are null. Cover a person comment image via the shared feed path. Assert the approval status-seal test IDs and contents remain unchanged.

- [ ] **Step 2: Run focused document tests and confirm the added assertions fail.**

  ```powershell
  npm run test -- tests/document-write-page.test.tsx tests/document-feed-item.test.tsx
  ```

- [ ] **Step 3: Add nullable response types and replace only person avatars.**

  Add `drafterProfileImage?: string | null`; retain `participantProfileImage?: string | null`; pass each image to `ProfileAvatar` with the exact current fallback child. Keep the status-seal MUI `Avatar`, document actions, approval flow, comment interactions, dimensions, and accessible names unchanged.

- [ ] **Step 4: Run focused document tests and confirm they pass.**

  ```powershell
  npm run test -- tests/document-write-page.test.tsx tests/document-feed-item.test.tsx
  ```

## Task 6: Full focused verification and result evidence

**Files:** update related docs and add result artifacts under `docs/result/20261022/groupware-profile-avatar/`.

- [ ] **Step 1: Run combined frontend tests and production build.**

  ```powershell
  npm run test -- tests/profile-avatar.test.tsx tests/feed-components.test.tsx tests/notice-page.test.tsx tests/notice-login-popup.test.tsx tests/document-write-page.test.tsx tests/document-feed-item.test.tsx
  npm run build
  ```

  Expected: selected tests pass and the production build completes successfully.

- [ ] **Step 2: Run focused backend verification.**

  ```powershell
  mvn "-Dtest=NoticeBoardTenantScopeMapperTest,DocumentApprovalMapperTest,CommonCommentServiceTest" test
  ```

  Expected: `BUILD SUCCESS`; existing test classes and any new mapper test are included.

- [ ] **Step 3: Verify affected browser layouts at 375px, 768px, and 1280px.**

  Reuse the existing application at `http://127.0.0.1:4173`; do not terminate a server that predates this task. Check a profile image, a missing image, and a failed image while confirming there is no new horizontal overflow. Save screenshots under `docs/result/20261022/groupware-profile-avatar/screenshots/` without personal data.

- [ ] **Step 4: Write the result document.**

  Record changed behavior, API/DB MCP evidence, tests/build, browser viewports, screenshots, and any limitation in `docs/result/20261022/groupware-profile-avatar/20261022_005_그룹웨어_프로필_이미지_표시_결과.md`.

- [ ] **Step 5: Commit only this task's files after verification.**

  Stage explicit file paths from this task and include:

  ```text
  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
  ```
