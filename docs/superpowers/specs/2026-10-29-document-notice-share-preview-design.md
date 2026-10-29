# Document and Notice Sharing with Unified Link Previews

## Goal

Let users share an approval document or a community notice, paste either internal share link into either feature's rich-text body or comments, see a preview, and open the target's detail panel. Keep external URL OG previews available in those same content surfaces.

## Existing behavior

- Approval documents already issue stateless AES-GCM share tokens bound to a tenant and document ID. Resolution requires login, checks the tenant, and reuses the normal readable-document query.
- Approval document share links are rendered as internal preview cards in document content and comments. Existing document detail-panel behavior must remain unchanged.
- Community notices already have authenticated tenant-scoped detail retrieval and a selected-notice side panel, but no share-link action or token endpoint.
- External web previews already use an authenticated metadata endpoint with outbound URL validation, DNS pinning, redirect checks, and response bounds.

## Approaches

1. **Share the frontend link classifier and preview component; preserve domain-specific share APIs and tokens (recommended).** Add a stateless notice token endpoint with its own authenticated resolution and domain-separated encryption context. Reuse shared link parsing/rendering for document, notice, and external links while keeping domain-specific permission checks and detail-panel callbacks. This minimizes behavior changes and prevents frontend duplication.
2. **Duplicate notice-specific preview and share UI.** This reduces the first integration's refactor surface but leaves document/notice extraction, async state, and card behavior likely to drift.
3. **Replace both token APIs with one generic shared-content API and token format.** This centralizes server logic but risks breaking existing document links and broadens the migration unnecessarily.

## Approved direction and behavior

- Keep document share token bytes, URL format, issuance checks, and resolution behavior backward-compatible.
- Add `공지 공유하기` to the notice owner's existing action menu. It issues a notice share token and copies the canonical internal URL, following the existing document share UX.
- Notice tokens are stateless, authenticated, tenant-bound, and cryptographically domain-separated from document tokens. Resolution checks the current user/tenant and calls the existing notice detail service; deleted or inaccessible notices are unavailable. No token or preview metadata is persisted.
- Extract document share links, notice share links, and external HTTP(S) destinations through one shared frontend classifier. Preserve supported legacy document-ID links. Do not send internal links to the external metadata endpoint.
- Render distinct `시스템 문서`, `공지사항`, and `웹 링크` cards. External cards continue to open the original external URL in a new tab. Internal cards open the appropriate in-app detail panel.
- Support link preview in document bodies/comments/replies and notice bodies/comments/replies. Deduplicate links per content body and ignore stale asynchronous responses.
- A same-module document or notice preview opens the existing linked/selected detail panel. A cross-module preview navigates to the target module with its share token; that page validates the token and opens its standard detail panel.
- Failed/expired/unauthorized internal shares show a generic unavailable state and never expose token details. External metadata failure keeps the original external link usable.
- The notice login-popup surface is not a separate share target; the share link opens the normal notice detail view.

## API and security

- Add authenticated notice share-link issuance and resolution endpoints under `/api/v1/groupware/boards/notice`.
- The encrypted notice token carries only tenant ID and notice ID. Use a notice-specific authenticated-encryption context so document tokens cannot be accepted as notice tokens.
- Issue only for an existing notice the authenticated user may read. On resolution, enforce login, same tenant, and the existing notice-detail access policy before returning details.
- Do not add a table, column, migration, or metadata cache. Preserve all existing document API contracts.
- Reuse the current external-link OG endpoint and its SSRF, timeout, redirect, and content-size protections unchanged.

## Frontend integration

- Move link classification/extraction and preview card composition to a feature-neutral shared feed component.
- Keep document and notice share API adapters in their owning domains, injected into the shared preview component through typed resolver callbacks.
- Add notice share-link URL parsing at the notice page entry and open the existing selected-notice panel after authenticated token resolution.
- Add contextual navigation callbacks so same-feature links retain their current panel behavior and cross-feature links use the target route's share URL.
- Preserve existing sanitization, editor save payloads, and comment service contracts.

## Failure handling and privacy

- Invalid, expired, deleted, cross-tenant, or unauthorized share links show a generic unavailable preview and do not disclose target IDs or token contents.
- Share-link creation failures are surfaced using the existing notification pattern; do not copy a partial or fallback URL.
- Do not log full share URLs or tokens. Share tokens are never stored.
- A failed external OG lookup does not block body/comment display or persistence.

## Validation

- Backend: notice token issuance/resolution, tenant isolation, authenticated access, domain separation, unavailable/deleted notices, and controller response contracts.
- Frontend: link classification, external/internal separation, legacy document links, token resolution and routing, owner share action/copy failure, detail-panel opening, mixed links in both domains' bodies/comments/replies, stale-result handling, and external failure fallback.
- Run focused backend and frontend tests, production build, and targeted lint.
- Browser-check mixed document/notice/external links and detail navigation at 375px, 768px, and 1280px. Save result screenshots and a dated report.
- Run `git diff --check`; retain all unrelated existing worktree changes.
