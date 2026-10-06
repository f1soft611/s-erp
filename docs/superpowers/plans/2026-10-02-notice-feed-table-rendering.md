# Notice Feed Table Rendering Implementation Plan

> **For agentic workers:** Execute inline task-by-task with test-first checkpoints. Do not change shared sanitizer defaults or persist table layout wrappers.

**Goal:** Preserve approved notice typography through save and render wide feed tables with the same contained horizontal scrolling as the composer.

**Architecture:** Add an opt-in text-style mode to the shared sanitizer while preserving its default behavior. A notice-specific utility uses that mode for saved body HTML and adds `.tableWrapper` only to feed-render HTML. Existing `noticeContentStyles` supplies feed typography and overflow styling.

**Tech Stack:** React, TypeScript, MUI `sx`, DOMParser, Vitest, Testing Library, Vite.

---

## Files

- Modify `frontend/src/shared/utils/sanitizeHtml.ts` and `frontend/tests/sanitize-html.test.ts` for opt-in span/font-style sanitizing.
- Create `frontend/src/pages/groupware/community/notice/utils/noticeHtml.ts` and `frontend/tests/notice-html.test.ts` for notice body sanitizing and feed-only table wrapping.
- Modify `frontend/src/pages/groupware/community/notice/CommunityNoticePage.tsx` to preserve allowed body typography at save.
- Modify `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx` and `frontend/tests/notice-page.test.tsx` to wrap feed tables and test collapsed/expanded render.
- Add `docs/result/20261002/notice-feed-table-rendering/result.md` and screenshots after browser verification.

## Task 1: Opt-in typography sanitization

**Files:** `frontend/src/shared/utils/sanitizeHtml.ts`, `frontend/tests/sanitize-html.test.ts`

- [x] Add a test proving default `sanitizeHtml` still unwraps spans and removes font styles.
- [x] Add a test proving an explicit typography option preserves safe span styles and strips `url(...)`, event handlers, and executable markup.
- [x] Use this test shape in `tests/sanitize-html.test.ts`:

```ts
expect(
  sanitizeHtml('<span style="font-family:Arial;font-size:10pt">셀</span>'),
).toBe('셀');
expect(
  sanitizeHtml('<span style="font-family:Arial;font-size:10pt">셀</span>', {
    preserveTextStyles: true,
  }),
).toContain('font-size:10pt');
```

- [x] Run `npm --prefix frontend run test -- tests/sanitize-html.test.ts` and verify the new opt-in test fails before implementation.
- [x] Add `type SanitizeHtmlOptions = { preserveTextStyles?: boolean }` and change the signature to `sanitizeHtml(value: string, options: SanitizeHtmlOptions = {})`. Build the allowed tag/style sets from the existing sets; only `preserveTextStyles === true` adds `span`, the six approved typography properties, and style attributes on `span`. Keep unsafe tag, attribute, and URL checks unchanged.
- [x] Rerun the sanitizer test and verify both default and opt-in cases pass.

## Task 2: Notice-specific HTML adapter

**Files:** create `frontend/src/pages/groupware/community/notice/utils/noticeHtml.ts`, create `frontend/tests/notice-html.test.ts`

- [x] Test `sanitizeNoticeBodyHtml` preserves safe typography and does not add a `.tableWrapper`.
- [x] Test `prepareNoticeFeedHtml` wraps an unwrapped table once, preserves font styles, and does not nest a second wrapper around an already wrapped table.
- [x] Test unsafe markup is removed from both outputs.
- [x] Assert save output contains only sanitized source HTML, while feed output contains a single `<div class="tableWrapper"><table...` around each top-level unwrapped table.
- [x] Run `npm --prefix frontend run test -- tests/notice-html.test.ts`; verify failures are the expected missing behavior.
- [x] Implement the two exports with this behavior:

```ts
export function sanitizeNoticeBodyHtml(html: string): string {
  return sanitizeHtml(html, { preserveTextStyles: true });
}

export function prepareNoticeFeedHtml(html: string): string {
  const sanitized = sanitizeNoticeBodyHtml(html);
  const document = new DOMParser().parseFromString(sanitized, 'text/html');
  Array.from(document.body.querySelectorAll('table')).forEach((table) => {
    if (table.parentElement?.closest('.tableWrapper')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'tableWrapper';
    table.replaceWith(wrapper);
    wrapper.appendChild(table);
  });
  return document.body.innerHTML.trim();
}
```

- [x] Rerun `npm --prefix frontend run test -- tests/notice-html.test.ts` and verify all adapter tests pass.

## Task 3: Save and feed integration

**Files:** modify `frontend/src/pages/groupware/community/notice/CommunityNoticePage.tsx`, `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`, `frontend/tests/notice-page.test.tsx`

- [x] Add a feed test with `<span style="font-family:Arial;font-size:10pt">` and a wide table; assert styles and one `.tableWrapper` exist in collapsed and expanded content.
- [x] Run the focused feed test and verify it fails on missing wrapper/style.
- [x] Replace notice-save `const safeHtml = sanitizeHtml(body || '<p></p>');` with `const safeHtml = sanitizeNoticeBodyHtml(body || '<p></p>');`.
- [x] Replace feed `const previewHtml = sanitizeHtml(normalizedPreviewHtml);` with `const previewHtml = prepareNoticeFeedHtml(normalizedPreviewHtml);`; keep image normalization/removal and interaction handling unchanged.
- [x] Rerun the focused notice-page test and verify collapsed/expanded output passes.

## Task 4: Regression and browser verification

**Files:** tests above, `docs/result/20261002/notice-feed-table-rendering/result.md`, screenshots under `docs/result/20261002/notice-feed-table-rendering/screenshots/`

- [x] Run focused sanitizer, notice HTML, clipboard/composer, and feed regression tests; confirm all pass.
- [x] Run `npm --prefix frontend run build` and confirm TypeScript and Vite build succeed.
- [x] In Chromium, inspect the notice feed at 1280px, 768px, and 375px. Confirm no document-level horizontal overflow and that `tableWrapper.scrollWidth > tableWrapper.clientWidth`.
- [x] Confirm feed wrapper CSS uses the existing horizontal scroll style; unit tests cover collapsed and expanded typography/wrapper output.
- [x] Save screenshots and record exact commands/results in `docs/result/20261002/notice-feed-table-rendering/result.md`.
- [x] Run `git diff --check` and inspect changed files for scope.
