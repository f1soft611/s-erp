# Document External URL OG Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add visually distinct Open Graph previews for external URLs in document bodies and comments while preserving encrypted internal document-share previews.

**Architecture:** Add an authenticated backend endpoint that validates external URLs, pins validated public DNS results, follows only a small number of revalidated redirects, and parses bounded HTML into a metadata DTO. Extend the existing link-preview UI to classify internal document links and external web links separately; do not persist metadata or change the database.

**Tech Stack:** Java 8-compatible Spring MVC, Apache HttpClient 4.x, Jsoup, React, TypeScript, MUI, Vitest, JUnit, Chromium.

---

## Files and responsibilities

- Modify `backend/pom.xml`: make the existing Apache HttpClient dependency available at runtime for DNS-pinned requests.
- Create `backend/src/main/java/egovframework/let/groupware/approval/shared/controller/DocumentLinkPreviewApiController.java`: authenticated metadata endpoint and standard `ResultVO` response.
- Create `backend/src/main/java/egovframework/let/groupware/approval/shared/service/DocumentLinkPreviewService.java`: request validation, pinned safe HTTP fetching, redirect limits, bounded response parsing, and OG metadata extraction.
- Create `backend/src/main/java/egovframework/let/groupware/approval/shared/controller/DocumentLinkPreviewRequestVO.java`: typed JSON request field for the target URL.
- Create `backend/src/main/java/egovframework/let/groupware/approval/shared/service/DocumentLinkPreviewVO.java`: allowlisted response fields.
- Create `backend/src/test/java/egovframework/let/groupware/approval/shared/service/DocumentLinkPreviewServiceTest.java`: URL/IP policy, redirect, body limit, content type, parser, and failure tests using a local mock HTTP server and injected resolver.
- Create `backend/src/test/java/egovframework/let/groupware/approval/shared/controller/DocumentLinkPreviewApiControllerTest.java`: authenticated endpoint response and rejected-input behavior.
- Modify `frontend/src/pages/groupware/documents/write/data/documentShareLink.ts`: extract external HTTP(S) destinations while excluding internal document links and unsafe schemes.
- Modify `frontend/src/pages/groupware/documents/write/services/documentApproval.service.ts`: POST URL to the metadata endpoint.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentLinkPreviews.tsx`: retain the internal card behavior and render independently labelled external preview cards.
- Modify `frontend/tests/document-link-sharing.test.tsx`: protect existing internal share behavior and test external link classification, lookup, failure, and click behavior.
- Create `docs/spec/20261029/20261029_003_문서_외부링크_OG_미리보기_상세사양서.md`.
- Create `docs/result/20261029/document-external-link-og/20261029_003_문서_외부링크_OG_미리보기_결과.md` and browser screenshots.

## Task 1: Define the API and test the external metadata response and URL policy

**Files:** create `docs/spec/20261029/20261029_003_문서_외부링크_OG_미리보기_상세사양서.md`; create `DocumentLinkPreviewVO.java`; create `DocumentLinkPreviewServiceTest.java`; create `DocumentLinkPreviewApiControllerTest.java`.

- [x] Write the detailed spec before implementation. Record endpoint `POST /api/v1/groupware/approvals/link-preview`, JSON `{ "url": "..." }`, response `item` fields `siteName`, `title`, `description`, and optional validated `imageUrl`; record authentication, limits, rejection behavior, and no DB changes.
- [x] Add failing parser tests for `og:title`, `og:description`, `og:site_name`, relative `og:image`, and `<title>` fallback. Assert that markup/script is never returned and all public fields are length-bounded.
- [x] Add failing input tests rejecting non-HTTP(S), missing host, user-info, non-default ports, localhost, literal private/reserved IPs, and hostnames whose DNS results contain any non-public address.
- [x] Add failing tests for redirect targets, response byte limits, non-HTML content, timeout/network failure, and successful public-host metadata retrieval. Inject a test transport/address resolver rather than weakening the production public-address policy to reach a loopback test server.
- [x] Run `cd backend; mvn -Dtest=DocumentLinkPreviewServiceTest test`; confirm the new class/tests fail because the implementation is absent.

## Task 2: Implement the authenticated backend metadata endpoint

**Files:** modify `backend/pom.xml`; create controller, service, request DTO, and response DTO above.

- [x] Move the existing `org.apache.httpcomponents:httpclient` dependency out of test scope; do not add a new HTTP library.
- [x] Implement a request DTO or a typed controller argument for JSON `{ "url": "..." }`; reject blank or over-2048-character input with a client error.
- [x] Require a logged-in `LoginVO` at the endpoint and return the metadata in the repository's existing `ResultVO.item` envelope.
- [x] Validate HTTP(S), hostname, user-info, and ports; resolve every hostname to addresses and reject the target if any answer is not globally routable. Reject IPv4/IPv6 special-use ranges, including mapped IPv4.
- [x] Use Apache HttpClient with a per-request DNS resolver that returns only the validated address set for the requested host. Disable automatic redirects, cookies, and compression. Do not configure a proxy or follow system proxy settings.
- [x] Follow at most three redirects manually; parse each `Location` against the previous URL and repeat all URL/DNS/IP checks before connecting.
- [x] Use finite connect/read timeouts, an identity encoding request, a maximum response-body byte count, and accept only `text/html` or `application/xhtml+xml`.
- [x] Parse response bytes with Jsoup without executing scripts. Use the validated final page URL as the parsing base, and return only normalized plain text for site/title/description and an optional HTTP(S) image URL whose host also passes the public-address check. Never include fetched HTML or exception/URL details in responses or logs.
- [x] Run `cd backend; mvn -Dtest=DocumentLinkPreviewServiceTest,DocumentLinkPreviewApiControllerTest test`; confirm the policy and endpoint tests pass.

## Task 3: Classify and render external links separately from internal shares

**Files:** modify `documentShareLink.ts`, `documentApproval.service.ts`, `DocumentLinkPreviews.tsx`, and `document-link-sharing.test.tsx`.

- [x] Add failing frontend cases proving internal `?share=` and legacy `documentId` links remain internal and never call the external metadata endpoint.
- [x] Add failing extraction cases for external HTTP(S) links in text and anchors, duplicate destinations, current-origin non-document URLs, and rejection of `javascript:`, `data:`, and malformed URLs.
- [x] Add failing UI cases for metadata loading, successful title/description/site/image card, generic unavailable state with the original link preserved, lookup failure, and external open in a new tab.
- [x] Run `cd frontend; node node_modules/vitest/vitest.mjs run tests/document-link-sharing.test.tsx --maxWorkers=1`; confirm the new cases fail before implementation.
- [x] Add a typed service method that POSTs `{ url }` to `/api/v1/groupware/approvals/link-preview`.
- [x] Extend the current preview component without changing internal share fetching. Render external results as a separate “웹 링크” card, label existing internal previews as “문서”, and render an optional lazy image with `referrerPolicy="no-referrer"`.
- [x] Ensure each external card uses an anchor with `target="_blank"` and `rel="noopener noreferrer"`; do not route external clicks to the internal detail panel.
- [x] Ignore stale asynchronous results after content changes/unmount and deduplicate matching external URLs within each body.
- [x] Run `cd frontend; node node_modules/vitest/vitest.mjs run tests/document-link-sharing.test.tsx --maxWorkers=1`; confirm all cases pass.

## Task 4: Document, browser-check, and final verification

**Files:** create the detailed spec, result report, and screenshots.

- [x] Run focused backend tests for the service and controller, then run `cd backend; mvn test` if the focused tests pass.
- [x] Run focused frontend tests, `cd frontend; npm run build`, and the repository's lint command. Report unrelated existing failures separately. (프론트엔드 전체 build는 통과했고, 백엔드 전체 테스트에서 동시 작업의 문서 참조확인 테스트 실패를 결과 보고서에 기록함.)
- [x] Reuse the S-ERP server on `http://127.0.0.1:4173` only after confirming its identity; otherwise start `npm run dev -- --strictPort` and clean up only the server started for this check.
- [x] Verify mixed internal/external links and loading/error/success states in Chromium at 375px, 768px, and 1280px. Capture screenshots under `docs/result/20261029/document-external-link-og/screenshots`.
- [x] Write the result report with test commands, browser outcomes, any existing limitations, and the fact that MCP confirmed no schema change is involved.
- [x] Run `git diff --check` and inspect the final changed-file list to ensure unrelated working-tree changes remain untouched.
