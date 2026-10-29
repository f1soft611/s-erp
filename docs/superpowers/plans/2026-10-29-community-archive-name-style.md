# Community Archive Name Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match archive folder/file labels and extension icon colors to the requested archive and shared attachment visual contract without changing interactions.

**Architecture:** Keep rendering in `ArchiveFileGrid`. Reuse `getAttachmentIconMeta` from the shared feed attachment UI instead of maintaining another extension map. Add regression assertions to the existing archive page integration test and update the F1-Grid/result documentation.

**Tech Stack:** React, TypeScript, MUI, F1Tree, Vitest, Testing Library.

---

## Files and responsibilities

- Modify `frontend/src/pages/groupware/community/archive/components/ArchiveFileGrid.tsx` to render neutral name colors, bold folder names, and shared colored extension icons.
- Modify `frontend/tests/archive-page.test.tsx` to verify styling and preserve folder navigation/download clicks.
- Modify `frontend/src/pages/f1-grid-docs/F1-GRID.md` to document the archive name/icon styling.
- Create `docs/result/20261029/archive-name-style/` result report and 375px/768px/1280px screenshots.

### Task 1: Add focused regression coverage

**Files:**
- Modify: `frontend/tests/archive-page.test.tsx`

- [x] Add an assertion to the existing root-tree test that the `업무양식` folder button has the theme text-primary color and bold font weight, and that `업무 가이드.pdf` has the same text-primary color but normal weight.
- [x] Add a test that clicks the file-name button and waits for `archiveServices.downloadArchiveAttachment` to be called with the listed file identifiers.
- [x] Assert the folder icon uses `text.secondary`, and the PDF icon's foreground/background colors match `getAttachmentIconMeta('업무 가이드.pdf')`, so the test follows shared styling rather than duplicating color literals.
- [x] Run `npm run test -- tests/archive-page.test.tsx` from `frontend`; confirm the new style assertions fail against the current implementation while folder navigation behavior remains green.

### Task 2: Reuse the shared attachment icon style

**Files:**
- Modify: `frontend/src/pages/groupware/community/archive/components/ArchiveFileGrid.tsx`

- [x] Import `getAttachmentIconMeta` from `../../../../../shared/components/feed/attachmentIconMeta`.
- [x] For folder rows, keep the current `Button` and `onFolderOpen(row.folderCode)`, set `color: 'text.primary'` and `fontWeight: 700`; set `FolderOutlined` to `color: 'text.secondary'` for both active and inactive folders.
- [x] For file rows, keep the current `Button` and `onDownload(row.file)`, set `color: 'text.primary'` and `fontWeight: 400`.
- [x] Replace the local `getFileIcon` mapping with `const iconMeta = getAttachmentIconMeta(row.file.fileName)`; render `iconMeta.icon` inside a 24px rounded box with `backgroundColor: iconMeta.bg` and `color: iconMeta.color`, matching the shared attachment list.
- [x] Run `npm run test -- tests/archive-page.test.tsx`; expect all archive page tests to pass, including the new assertions.

### Task 3: Document and verify the delivered UI

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Create: `docs/result/20261029/archive-name-style/20261029_006_자료실_이름_아이콘_개선_결과보고서.md`
- Create: `docs/result/20261029/archive-name-style/screenshots/archive-375.png`
- Create: `docs/result/20261029/archive-name-style/screenshots/archive-768.png`
- Create: `docs/result/20261029/archive-name-style/screenshots/archive-1280.png`

- [x] Add the neutral name color, bold folder name, shared extension icon color, and unchanged click behavior to the archive section of `F1-GRID.md`.
- [x] Run `npx oxlint src/pages/groupware/community/archive/components/ArchiveFileGrid.tsx tests/archive-page.test.tsx` from `frontend`; expect no lint errors.
- [x] Reuse the existing S-ERP server on `http://127.0.0.1:4173`, render the archive page at 375px, 768px, and 1280px, and capture screenshots in the listed result directory.
- [x] Write the result report with implemented behavior, test/lint outcomes, viewport findings, and screenshot links.
- [x] Run `git diff --check`; confirm there are no whitespace errors and no unrelated files were edited for this request.
