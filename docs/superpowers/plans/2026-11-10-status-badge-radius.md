# Status Badge Colors and Radius Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align document and notice status badge colors with the supplied reference and normalize ordinary frontend corner radii to 6px.

**Architecture:** Keep `documentPresentation.ts` as the canonical source for document state/kind semantics and retain the notice category's existing code-derived palette. Use the existing MUI theme radius of 6px as the global baseline, normalizing explicit radii while preserving circles and zero-radius joins.

**Tech Stack:** React, TypeScript, MUI, Vitest, Vite, Playwright.

---

## Files and responsibilities

- Modify `frontend/src/pages/groupware/documents/write/data/documentPresentation.ts` for state and kind semantics.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`, `ApprovalNoticePanel.tsx`, and `frontend/src/pages/groupware/community/notice/components/NoticeCategoryBadge.tsx` for consistent badge radius.
- Normalize explicit corner radii in `frontend/src/**/*.{tsx,ts,css}`; preserve `50%` and `0`.
- Extend `frontend/tests/document-presentation.test.ts` and relevant badge component tests.
- Save test screenshots and report under `docs/result/20261110/status-badge-radius/`.

### Task 1: Update and verify semantic presentation tests

**Files:**
- Modify: `frontend/tests/document-presentation.test.ts`
- Modify: `frontend/src/pages/groupware/documents/write/data/documentPresentation.ts`

- [ ] Update the canonical status expectations so draft is filled/neutral and the work document kind maps to success green.
- [ ] Run `cd frontend; npm run test -- tests/document-presentation.test.ts` and confirm the changed expectations fail before implementation.
- [ ] Update only the presentation map; keep labels and status codes unchanged.
- [ ] Rerun the focused test and confirm it passes.

### Task 2: Apply shared badge radius

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/ApprovalNoticePanel.tsx`
- Modify: `frontend/src/pages/groupware/community/notice/components/NoticeCategoryBadge.tsx`
- Modify: relevant existing tests under `frontend/tests/`

- [ ] Add/extend tests to assert the displayed document status, document-kind and notice-category chips use 6px corner radius without changing labels or category colors.
- [ ] Run the related test files and verify the radius assertions fail against the current 8px/variable values.
- [ ] Replace badge-specific values with the 6px common radius; preserve notice category dark-mode contrast and code-based colors.
- [ ] Run the focused tests and verify both light/dark presentation remains valid.

### Task 3: Normalize explicit frontend radii

**Files:**
- Modify: matching files under `frontend/src/**/*.{tsx,ts,css}` found by `rg -n "borderRadius|border-radius" frontend/src`

- [ ] Inventory each explicit radius and mark circles (`50%`) and intentionally square boundaries (`0`) as exceptions.
- [ ] Convert other MUI numeric values to `1.5` theme units (6px) and CSS/string pixel values to `6px`; keep corner-specific zero joins square.
- [ ] Run `rg -n "borderRadius|border-radius" frontend/src` and manually inspect all remaining non-6px values for valid circle/zero exceptions.
- [ ] Run `npm run build` and the focused component tests.

### Task 4: Browser verification and result report

**Files:**
- Create: `docs/result/20261110/status-badge-radius/20261110_005_status_badge_radius_결과보고서.md`
- Create: `docs/result/20261110/status-badge-radius/screenshots/` (synthetic data only)

- [ ] Check whether `http://127.0.0.1:4173` is already serving this app; reuse only a confirmed app server, otherwise launch `npm run dev -- --strictPort`.
- [ ] Inspect the document/notice badge presentation and representative project corners at 375px, 768px, and 1280px; ensure no clipping, overlap, or page-level horizontal overflow.
- [ ] Save screenshots using English lowercase/digits/hyphens in the filename and record actual results in the report.
- [ ] Run `git diff --check`; stop only a server started for this verification and confirm the port is released.
