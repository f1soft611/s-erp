# Document Write Responsive Width Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the document-write page and its right-side detail overlay within the available dashboard content width on narrow screens.

**Architecture:** Preserve the existing page-local `PageAreaOverlay` containing block and add `minWidth: 0` only to the `DocumentWritePage` flex root. A focused integration assertion guards that width contract; no app-shell or shared overlay layout changes are planned.

**Tech Stack:** React, TypeScript, MUI, Vitest, React Testing Library.

---

## Approved references

- [Approved design](../specs/2026-10-15-document-write-responsive-width-design.md)
- [Dated work order](../../directions/20261015/20261015_010_문서작성_상세패널_모바일_너비_수정_작업지시서.md)
- [Dated plan](../../plan/20261015/20261015_010_document_write_responsive_width_plan.md)
- [Detailed specification](../../spec/20261015/20261015_010_document_write_responsive_width_spec.md)
- Existing page-area overlay requirements: [20260923_004 specification](../../spec/20260923/20260923_004_페이지영역_우측오버레이_상세패널_상세사양서.md)

## File map

- Modify `frontend/tests/document-write-page.test.tsx`: assert the rendered document page root has `min-width: 0`.
- Modify `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`: add the constraint to the page root only.
- Create `docs/result/20261015/document-write-responsive-width/20261015_010_document_write_responsive_width_result.md`: record focused verification and browser availability.
- Update `docs/result/20261015/document-approval-toolbar-reordering/20261015_006_document_approval_toolbar_reordering_result.md`: replace the pending-scope note with the follow-up resolution and link.

## Task 1: Add a failing root-width regression assertion

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`

- [ ] In `renders at the groupware write route instead of the coming-soon page`, retain the current route assertions and add:

```tsx
expect(screen.getByTestId('document-write-page')).toHaveStyle({
  minWidth: '0px',
});
```

- [ ] Run only this test before production changes:

```powershell
Set-Location frontend
npx vitest run tests/document-write-page.test.tsx --testNamePattern="renders at the groupware write route instead of the coming-soon page"
```

Expected: FAIL because the page root does not yet declare `min-width: 0`.

## Task 2: Constrain the document page flex root

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`

- [ ] Add `minWidth: 0` to the root `Box` `sx` object, next to the existing `flex: 1` and `minHeight: 0`:

```tsx
sx={{
  flex: 1,
  position: 'relative',
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}}
```

- [ ] Do not change `PageAreaOverlay`, its media query, app-shell widths, or page behavior.
- [ ] Re-run the focused regression test from Task 1.

Expected: PASS; the rendered page root allows the flex item to shrink within its parent content width.

## Task 3: Verify the focused page and overlay behavior

**Files:**
- Verify: `frontend/tests/document-write-page.test.tsx`
- Verify: `frontend/tests/post-detail-panel.test.tsx`
- Verify: `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`

- [ ] Run the focused document-write regression test and the shared detail-panel test:

```powershell
Set-Location frontend
npx vitest run tests/document-write-page.test.tsx --testNamePattern="renders at the groupware write route instead of the coming-soon page"
npx vitest run tests/post-detail-panel.test.tsx
```

- [ ] Run `npm run build` from `frontend`.
- [ ] Run Problems validation on `DocumentWritePage.tsx` and `document-write-page.test.tsx`; run `git diff --check`.
- [ ] Check the authenticated app at 375px, 768px, and 1280px if the session is available. Measure page and panel rects and verify `document.documentElement.scrollWidth <= window.innerWidth`. If the app redirects to login, do not claim browser confirmation.
- [ ] Create the dated result document with exact test/build outcomes and the browser limitation or measured results. Update the existing toolbar result document so it no longer describes the confirmed 375px issue as still awaiting a scope decision.
