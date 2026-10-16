# Document Edit Image Resize Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep authenticated Blob previews visible when an existing approval-document image is resized, without changing persisted image URLs.

**Architecture:** The edit-composer hydration effect will keep a map from each protected approval-image URL to its temporary Blob URL. An editor-update listener will reapply loaded previews to re-rendered image elements and continue hiding failed protected images; the ProseMirror model and save payload remain unchanged.

**Tech Stack:** React, TipTap/ProseMirror, TypeScript, Vitest, React Testing Library.

---

## File Map

- Modify `frontend/tests/document-write-page.test.tsx`: exercise the real image-resize handle in the protected-image composer test; assert preview source after re-render and canonical saved source plus resized dimensions.
- Modify `frontend/src/pages/groupware/documents/write/hooks/useDocumentComposer.ts`: preserve temporary preview rendering across editor updates and retain cleanup/error behavior.
- Create `docs/directions/20261015/20261015_019_문서수정_이미지_리사이즈_미리보기_복원_작업지시서.md`.
- Create `docs/plan/20261015/20261015_019_문서수정_이미지_리사이즈_미리보기_복원_계획서.md`.
- Create `docs/spec/20261015/20261015_019_문서수정_이미지_리사이즈_미리보기_복원_상세사양서.md`.
- Create `docs/result/20261015/document-edit-image-resize-preview/20261015_019_문서수정_이미지_리사이즈_미리보기_결과보고서.md`.
- Approved design: `docs/superpowers/specs/2026-10-15-document-edit-image-resize-preview-design.md`.

## Task 1: Reproduce image source reset through the resize handle

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`

- [ ] **Step 1: Extend the protected-image edit test**

In `loads protected existing images in the edit composer without saving blob URLs`, after the current wait for the `blob:approval-image-preview` source, select the image and drag its southeast resize handle:

```tsx
const image = dialog.querySelector<HTMLImageElement>(
  '.document-composer-editor .ProseMirror img',
);
if (!image) throw new Error('Expected the existing document image in the editor');
const elementFromPointDescriptor = Object.getOwnPropertyDescriptor(
  document,
  'elementFromPoint',
);
Object.defineProperty(document, 'elementFromPoint', {
  configurable: true,
  value: vi.fn(() => image),
});
try {
  fireEvent.mouseDown(image);
} finally {
  if (elementFromPointDescriptor) {
    Object.defineProperty(document, 'elementFromPoint', elementFromPointDescriptor);
  } else {
    delete (document as Document & { elementFromPoint?: unknown }).elementFromPoint;
  }
}
const resizeHandle = await screen.findByLabelText(
  'se 방향 이미지 크기 조절',
);
fireEvent.pointerDown(resizeHandle, { clientX: 0, clientY: 0 });
fireEvent.pointerMove(window, { clientX: 50, clientY: 50 });
fireEvent.pointerUp(window);
await waitFor(() =>
  expect(
    dialog.querySelector('.document-composer-editor .ProseMirror img'),
  ).toHaveAttribute('src', 'blob:approval-image-preview'),
);
```

Use a local non-null assertion only after the explicit `not.toBeNull()` assertion if required by TypeScript; otherwise use a guarded local. Then assert the resized image retains width `400px` and height `250px`. Keep the existing save assertion and add checks that saved HTML contains the original approval-image URL and resized dimensions but not `blob:approval-image-preview`.

- [ ] **Step 2: Run the focused test and verify RED**

Run from `frontend`:

```powershell
npx vitest run tests/document-write-page.test.tsx -t "loads protected existing images" --testTimeout=20000
```

Expected: FAIL because the resize transaction re-renders the image with the protected approval-image URL rather than the Blob preview. If the test fails before reaching this assertion, correct only the event sequence until it reproduces the `src` reset.

## Task 2: Reapply authenticated previews after ProseMirror updates

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/hooks/useDocumentComposer.ts`

- [ ] **Step 1: Keep preview and failed-source maps in the hydration effect**

In the effect that currently loads protected image Blobs, replace the per-element-only `resolvedImages` tracking with:

```tsx
const previewUrls = new Map<string, string>();
const failedSources = new Set<string>();
const syncImagePreviews = () => {
  editor.view.dom.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
    const source = image.getAttribute('src') ?? '';
    const previewUrl = previewUrls.get(source);
    if (previewUrl) {
      image.setAttribute('src', previewUrl);
    } else if (failedSources.has(source)) {
      image.removeAttribute('src');
    }
  });
};
editor.on('update', syncImagePreviews);
```

Register the listener before starting asynchronous fetches. For a fulfilled request, store `request.source -> objectUrl` and call `syncImagePreviews()` so the current editor DOM is updated even if it was re-rendered while the request was pending. For a rejected request, add its source to `failedSources`, call the same synchronizer, and preserve the existing single error message.

- [ ] **Step 2: Preserve safe URL cleanup**

In the effect cleanup, mark the request inactive, remove the update listener, restore any current image whose source is one of the created preview URLs back to its matching original source, then revoke each created URL. Do not write preview URLs into editor node attributes or save data.

- [ ] **Step 3: Run the focused test and verify GREEN**

Run:

```powershell
npx vitest run tests/document-write-page.test.tsx -t "loads protected existing images" --testTimeout=20000
```

Expected: PASS; the image remains a Blob preview after resize, its width/height are retained, and the save payload contains the protected URL rather than a Blob URL.

## Task 3: Verify regressions and record results

**Files:**
- Update: `docs/directions/20261015/20261015_019_문서수정_이미지_리사이즈_미리보기_복원_작업지시서.md`
- Update: `docs/plan/20261015/20261015_019_문서수정_이미지_리사이즈_미리보기_복원_계획서.md`
- Update: `docs/spec/20261015/20261015_019_문서수정_이미지_리사이즈_미리보기_복원_상세사양서.md`
- Create: `docs/result/20261015/document-edit-image-resize-preview/20261015_019_문서수정_이미지_리사이즈_미리보기_결과보고서.md`

- [ ] **Step 1: Run focused image and neighboring edit regressions**

Run:

```powershell
npx vitest run tests/document-write-page.test.tsx -t "loads protected existing images|shows and preserves existing attachments" --testTimeout=20000
```

Expected: both selected tests pass.

- [ ] **Step 2: Run production build and diagnostics**

Run:

```powershell
npm run build
git diff --check
```

Run Problems diagnostics on `useDocumentComposer.ts` and `document-write-page.test.tsx`. Expected: build and whitespace validation pass; record any pre-existing chunk warning.

- [ ] **Step 3: Record browser verification**

Try the current S-ERP browser route at `http://127.0.0.1:4173/groupware/documents/write` only with its existing authenticated session. Do not bypass authentication. If it redirects to login, document that the resize UI could not be visually verified and record the automated regression evidence instead.

- [ ] **Step 4: Complete the dated documents**

Ensure the work instruction, plan, and detailed specification agree that resizing an existing image preserves the Blob preview while saving the canonical approval-image URL and resized dimensions. Record exact test/build/diagnostic outcomes and browser access status in the result report.
