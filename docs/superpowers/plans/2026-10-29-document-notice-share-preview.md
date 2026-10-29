# Document and Notice Share Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add notice sharing and a common link-preview experience so document-share links, notice-share links, and external OG links preview in document and notice bodies/comments and open the correct detail panel.

**Architecture:** Keep the existing document token/API behavior compatible. Add a reusable domain-separated token codec and authenticated notice share endpoints; move classification and preview-card composition into a shared frontend feed component while keeping domain API adapters and detail-panel callbacks in their owning features. Notice routes resolve a share token before opening the existing selected-notice panel; cross-feature links navigate to the target feature route.

**Tech Stack:** Java 8-compatible Spring MVC, Spring Security, AES-GCM, React, TypeScript, React Router, MUI, Vitest, JUnit, Chromium.

---

## Files and responsibilities

- Create `docs/directions/20261029/20261029_004_문서_공지_공유링크_상호미리보기_작업지시서.md`: user requirements, scope, process, and completion checks.
- Create `docs/plan/20261029/20261029_004_문서_공지_공유링크_상호미리보기_계획서.md`: dated project plan linked to this implementation plan.
- Create `docs/spec/20261029/20261029_004_문서_공지_공유링크_상호미리보기_상세사양서.md`: API, token, permissions, preview, navigation, and test contract.
- Create `backend/src/main/java/egovframework/let/groupware/shared/service/ShareTokenCodec.java`: stateless tenant/content token encryption with an explicit content domain context.
- Modify `backend/src/main/java/egovframework/let/groupware/approval/shared/service/DocumentApprovalShareService.java`: delegate document token crypto to the codec without changing token bytes, URL format, or authorization behavior.
- Create `backend/src/main/java/egovframework/let/groupware/community/notice/service/NoticeShareService.java`: issue and resolve tenant-bound notice tokens using the notice-specific context and existing notice detail policy.
- Create `backend/src/main/java/egovframework/let/groupware/community/notice/controller/NoticeShareApiController.java`: expose authenticated notice share-link issue and resolve endpoints.
- Create `backend/src/test/java/egovframework/let/groupware/shared/service/ShareTokenCodecTest.java` and `backend/src/test/java/egovframework/let/groupware/community/notice/service/NoticeShareServiceTest.java`.
- Create `backend/src/test/java/egovframework/let/groupware/community/notice/controller/NoticeShareApiControllerTest.java` to verify authentication and response envelopes.
- Create `frontend/src/shared/components/feed/contentShareLinks.ts`: parse/extract external URLs and typed document/notice share references from sanitized HTML.
- Create `frontend/src/shared/components/feed/FeedLinkPreviews.tsx`: reusable document, notice, and external preview cards with per-item async state.
- Modify `frontend/src/pages/groupware/documents/write/data/documentShareLink.ts`: preserve its exported API while delegating common classification to the shared helper and add canonical notice-link parsing/building as needed.
- Modify `frontend/src/pages/groupware/documents/write/services/documentApproval.service.ts` and `frontend/src/pages/groupware/community/notice/services/noticeBoardService.ts`: typed share issue/resolve adapters for their respective domains.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentLinkPreviews.tsx`: keep the document feature adapter as a thin wrapper around `FeedLinkPreviews`.
- Modify `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`: add the notice share action and pass shared previews for body and comments/replies.
- Modify `frontend/src/pages/groupware/community/notice/CommunityNoticePage.tsx` and `frontend/src/pages/groupware/community/notice/hooks/useNoticeInteractions.ts`: resolve `?share=` on entry, open the selected-notice panel, and provide cross-feature navigation.
- Modify `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`, `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`, and `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx`: route cross-feature notice links while retaining the existing document detail panel.
- Modify `frontend/src/shared/components/feed/TiptapCommentThread.tsx` only if a wrapper is needed to ensure the existing `renderContentPreview` contract supports link cards in all notice comment/reply states.
- Modify focused frontend tests in `frontend/tests/document-link-sharing.test.tsx`, `frontend/tests/document-link-content.test.tsx`, `frontend/tests/document-approval-service.test.ts`, and the existing notice page/feed/service test files.
- Create `frontend/tests/document-notice-share-preview.browser.mjs`.
- Create `docs/result/20261029/document-notice-sharing-previews/20261029_004_문서_공지_공유링크_상호미리보기_결과.md` and screenshots under its `screenshots/` directory.

## Task 1: Add a shared, domain-separated token codec and notice share API

**Files:** codec, document share service, notice share service/controller, focused backend tests.

- [x] **Step 1: Add codec tests that protect existing document tokens and reject cross-domain use.** Cover deterministic round-trip with a fixed test vector, malformed/non-canonical token rejection, a token issued for `DOCUMENT` rejected under `NOTICE`, tenant mismatch, and missing/short secret behavior. Keep the existing document service tests as compatibility coverage.
- [x] **Step 2: Run the focused tests and confirm the new codec/service symbols are missing.**

  Run: `cd backend; mvn "-Dtest=ShareTokenCodecTest,NoticeShareServiceTest,NoticeBoardApiControllerTest,DocumentApprovalShareApiControllerTest" test`

  Expected: compilation/test failure because the codec and notice share API do not exist yet.
- [x] **Step 3: Implement the codec with a closed domain enum and the current document token format.** Use 12 random IV bytes, AES/GCM/NoPadding, 128-bit tag, base64url without padding, and the same `v1.` prefix. Derive a separate encryption key and AAD from the supplied closed domain context; use the existing document context for document tokens and a new notice context for notices. Payload is exactly two 64-bit values: tenant ID and content ID. Never accept a raw context from HTTP input.
- [x] **Step 4: Refactor document share crypto through the codec and add notice share services.** Document token issuance/resolution must pass the document domain and retain current validation/query behavior. Notice issuance/resolution must require a login and positive tenant, confirm the notice exists in that tenant through `NoticeBoardService.getPost(tenantId, postId)`, encode/decode the notice token, reject a token for another tenant with the same generic 404 behavior, and use the authenticated notice detail service for the resolved record.
- [x] **Step 5: Add authenticated notice endpoints and test the response envelope.** Add `POST /api/v1/groupware/boards/notice/posts/{postId}/share-link` returning `item.token` and `GET /api/v1/groupware/boards/notice/shared-post?token=...` returning the resolved notice detail. Use the existing `ResultVO` conventions and do not add DB tables or columns.
- [x] **Step 6: Run focused backend tests.**

  Run: `cd backend; mvn "-Dtest=ShareTokenCodecTest,NoticeShareServiceTest,NoticeBoardApiControllerTest,DocumentApprovalShareApiControllerTest" test`

  Expected: all targeted tests pass, including old document token tests and document/notice domain separation.

## Task 2: Add shared link classification and reusable preview cards

**Files:** shared helper/component, document wrapper and service adapters, focused frontend tests.

- [x] **Step 1: Write failing extraction tests** for three typed outcomes: current-origin document `?share=` links, canonical notice `?share=` links, and external HTTP(S) URLs. Retain the legacy document `documentId` case. Verify duplicate removal, text and anchor support, no URL extraction from anchor labels, and rejection of unsafe schemes/current-origin non-share routes.
- [x] **Step 2: Run the focused test file to establish the red state.**

  Run: `cd frontend; node node_modules\\vitest\\vitest.mjs run tests\\document-link-sharing.test.tsx --maxWorkers=1`

  Expected: new notice classification cases fail before the common helper exists.
- [x] **Step 3: Implement `contentShareLinks.ts` with a discriminated reference type.** The helper returns `{ kind: 'document', reference: number | string, href: string }`, `{ kind: 'notice', token: string, href: string }`, or `{ kind: 'external', url: string }`; it recognizes only canonical same-origin app paths, preserves supported legacy document IDs, never classifies an internal share as an external URL, and deduplicates results in source order.
- [x] **Step 4: Implement `FeedLinkPreviews.tsx` as the shared renderer.** Accept typed document/notice/external resolver callbacks plus same-domain open callbacks and a common cross-domain detail-panel fallback. Render internal labels `시스템 문서` and `공지사항`; external cards show metadata without a standalone caption. Retain external `target="_blank"`/`rel="noopener noreferrer"` and lazy `no-referrer` images. Internal lookup failures show a generic unavailable card; external lookup failures preserve the source URL. Ignore stale component results after URL changes or unmount.
- [x] **Step 5: Add typed notice issue/resolve methods and retain document exports.** Notice URL generation uses `${window.location.origin}/groupware/community/notice?share=${encodeURIComponent(token)}`. Document helper exports continue to return their current URL and parse existing token/legacy formats. Both wrappers inject their existing API adapters into the shared renderer; do not modify the external OG API contract.
- [x] **Step 6: Verify focused link tests.**

  Run: `cd frontend; node node_modules\\vitest\\vitest.mjs run tests\\document-link-sharing.test.tsx tests\\document-approval-service.test.ts --maxWorkers=1`

  Expected: all tests pass, including the existing document share and external OG cases.

## Task 3: Add notice share action and share-token entry navigation

**Files:** `NoticeFeedList.tsx`, `CommunityNoticePage.tsx`, `useNoticeInteractions.ts`, notice service tests/page tests.

- [x] **Step 1: Write failing tests** proving the notice owner menu exposes the share action and the share service returns only a canonical notice URL after a valid token response. Browser validation verifies clipboard success; API and clipboard failures are surfaced by the page notification handler. Verify non-owner rows do not expose the action.
- [x] **Step 2: Run the targeted notice tests to establish the red state.**

  Run: `cd frontend; node node_modules\\vitest\\vitest.mjs run tests\\notice-page.test.tsx tests\\notice-board-service.test.ts --maxWorkers=1`

  Expected: tests fail because notice sharing has not been wired.
- [x] **Step 3: Add `onShare` to `NoticeFeedListProps` and the existing owner menu.** Match `DocumentApprovalDetailFeed` behavior: await link creation, write it with `navigator.clipboard.writeText`, show a success notification only after both succeed, and show a generic share/clipboard error otherwise.
- [x] **Step 4: Resolve a notice share URL on page entry.** Read one `share` parameter from `/groupware/community/notice`, call the notice resolver, then select/open the existing detail panel with the resolved notice ID and `appendMissing: true`. Ignore stale resolution after unmount; invalid or unauthorized tokens use a generic unavailable notification. Preserve the existing `dashboardPostId` path.
- [x] **Step 5: Open cross-feature details in place (updated by follow-up request).** Both directions use a common right-side panel after token resolution, preserving the source page and URL. Nested links replace its target. Same-feature links retain their current selected/linked detail-panel callbacks. See the dated plan for the common panel and notice adapter implementation.
- [x] **Step 6: Run the focused notice and document page tests.**

  Run: `cd frontend; node node_modules\\vitest\\vitest.mjs run tests\\notice-page.test.tsx tests\\notice-board-service.test.ts tests\\document-write-page.test.tsx tests\\document-link-content.test.tsx --maxWorkers=1`

  Expected: all relevant tests pass; existing dashboard notice entry and document-share query behavior remain unchanged.

## Task 4: Render shared previews in notice bodies/comments and unify document rendering

**Files:** `NoticeFeedList.tsx`, `DocumentLinkPreviews.tsx`, document body/composer/detail feed, comment tests.

- [x] **Step 1: Add failing rendering tests** for mixed document, notice, and external links in notice body, notice comment/reply, document body, and document comment/reply. Assert distinct labels, correct service invocation, same-module detail callbacks, cross-module navigation, and external new-tab attributes.
- [x] **Step 2: Run the focused feed tests to verify the new notice cases fail.**

  Run: `cd frontend; node node_modules\\vitest\\vitest.mjs run tests\\document-link-sharing.test.tsx tests\\document-link-content.test.tsx tests\\notice-page.test.tsx --maxWorkers=1`

  Expected: the new notice body/comment share preview assertions fail.
- [x] **Step 3: Pass the shared renderer for notice body content.** Use the sanitized `previewHtml`/expanded HTML already produced in `NoticeFeedList`; do not run the external OG endpoint on unsanitized raw content or alter stored HTML.
- [x] **Step 4: Pass the shared renderer into notice `CommentThread.renderContentPreview`.** `TiptapCommentThread` already supports `renderContentPreview`; reuse it for comment and reply content and avoid changing comment persistence/API contracts.
- [x] **Step 5: Keep `DocumentLinkPreviews` as a thin compatibility wrapper.** Route composer preview, document detail body, and document comment/reply HTML through `FeedLinkPreviews`; retain document-specific `onOpenDocument` and use the shared in-place panel fallback for notice links.
- [x] **Step 6: Run focused tests and targeted lint.**

  Run: `cd frontend; node node_modules\\vitest\\vitest.mjs run tests\\document-link-sharing.test.tsx tests\\document-link-content.test.tsx tests\\notice-page.test.tsx --maxWorkers=1`

  Run: `cd frontend; npx oxlint src\\shared\\components\\feed\\contentShareLinks.ts src\\shared\\components\\feed\\FeedLinkPreviews.tsx src\\pages\\groupware\\community\\notice\\components\\NoticeFeedList.tsx src\\pages\\groupware\\community\\notice\\CommunityNoticePage.tsx src\\pages\\groupware\\documents\\write\\components\\DocumentLinkPreviews.tsx`

  Expected: all focused tests pass and oxlint exits 0.

## Task 5: Document and verify the end-to-end flow

**Files:** dated direction/plan/spec/result documents, browser test, screenshots.

- [x] **Step 1: Create the dated work instruction, plan, and detail spec** under `docs/directions/20261029`, `docs/plan/20261029`, and `docs/spec/20261029` using matching sequence `20261029_004`; link each to the committed design and this plan.
- [x] **Step 2: Add a Playwright browser test** that mocks only API responses, loads a document share link and notice share link in each target module, checks mixed cards in bodies and comments, follows cross-module cards to the target route and panel, and verifies external links open in a separate tab.
- [x] **Step 3: Run browser validation at all required widths.**

  Confirm the existing `127.0.0.1:4173` process is the S-ERP Vite server before reusing it. Run `cd frontend; node tests\\document-notice-share-preview.browser.mjs`.

  Expected: 375px, 768px, and 1280px each report successful document/notice detail navigation, distinct card labels, external new-tab behavior, and no horizontal overflow. Save screenshots in `docs/result/20261029/document-notice-sharing-previews/screenshots`.
- [x] **Step 4: Run focused verification.**

  Run: `cd backend; mvn "-Dtest=ShareTokenCodecTest,NoticeShareServiceTest,NoticeBoardApiControllerTest,DocumentApprovalShareApiControllerTest" test`

  Run: `cd frontend; npm run build`

  Run: `cd frontend; node node_modules\\vitest\\vitest.mjs run tests\\document-link-sharing.test.tsx tests\\document-link-content.test.tsx tests\\document-approval-service.test.ts tests\\notice-page.test.tsx tests\\notice-board-service.test.ts tests\\document-write-page.test.tsx --maxWorkers=1`

  Run: `git diff --check`

  Expected: all targeted commands exit 0. If the full backend suite is run and unrelated concurrent tests fail, record exact classes/counts without changing unrelated work.
- [x] **Step 5: Write the result report** with token/security behavior, shared preview coverage, DB MCP table-list check/no schema change, focused test counts, browser widths/screenshots, and any unrelated validation failures.

## Design and scope invariants

- Do not change document token bytes, routes, access checks, detail behavior, or existing `documentId` compatibility.
- Do not add DB persistence for share tokens or OG metadata.
- Share links only reveal a target after authenticated tenant and current access checks.
- No internal share URL may be sent to the external OG metadata endpoint.
- Preserve existing rich-text sanitization, comment payloads, notice popup behavior, and unrelated worktree changes.
