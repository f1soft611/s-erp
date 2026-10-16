# Notice Category Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each active notice category a stable, distinct frontend color while preserving notice labels, importance behavior, and the existing API/database contract.

**Architecture:** Resolve chip presentation deterministically from a stable hash of `noticeGubunCode` into a 360-degree HSL palette. Keep the category label and `isNotice` importance behavior independent; use the current blue treatment only when the category code is absent.

**Tech Stack:** React, TypeScript, MUI, Vitest, React Testing Library.

---

## Approved detailed specification

Follow [the dated notice-category specification](../../spec/20261015/20261015_007_notice_category_colors_spec.md) and [the approved design](../../superpowers/specs/2026-10-15-document-approval-toolbar-reorder-notice-category-colors-design.md). Derive colors from category codes rather than names, so tenant-specific and future active codes are supported without explicit registration. No API, common-code, or database fields are added.

## File map

- Create `frontend/src/pages/groupware/community/notice/data/noticeCategoryPresentation.ts`: stable code-hash-to-HSL resolver and missing-code fallback presentation for light/dark themes.
- Modify `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`: apply the resolver to the category Chip using the item's `noticeGubunCode`.
- Create `frontend/tests/notice-category-presentation.test.ts`: unit coverage for mapped colors, repeat-code stability, fallback behavior, and no-code behavior.
- Modify `frontend/tests/notice-page.test.tsx`: verify rendered category chips use code-specific presentations and preserve their labels/importance behavior.
- Create `docs/spec/20261015/20261015_007_notice_category_colors_spec.md`: record the category palette and fallback contract.
- Create `docs/result/20261015/notice-category-colors/20261015_007_notice_category_colors_result.md`: record implementation and verification.
- Add screenshots under `docs/result/20261015/notice-category-colors/screenshots/` only if a browser capture is useful and available.

## Task 1: Add failing category-presentation tests

**Files:**
- Create: `frontend/tests/notice-category-presentation.test.ts`
- Modify: `frontend/tests/notice-page.test.tsx`

- [ ] Add unit cases asserting representative distinct codes resolve to different HSL colors and repeated resolution of the same code returns exactly the same colors.
- [ ] Add cases asserting an unknown non-empty category code receives a deterministic HSL color and an absent/blank code retains the current blue default.
- [ ] Add a rendered `NoticeFeedList` test with two category codes; verify labels remain unchanged, the chips use their respective colors in both light and dark modes, and `isNotice` importance behavior is unchanged.
- [ ] Run the focused tests before adding the resolver:

```powershell
Set-Location frontend
npx vitest run tests/notice-category-presentation.test.ts tests/notice-page.test.tsx --testNamePattern="category"
```

Expected: FAIL because the presentation resolver is not defined and the category chips still share the same blue styling.

## Task 2: Add the code-based palette resolver and wire the notice chip

**Files:**
- Create: `frontend/src/pages/groupware/community/notice/data/noticeCategoryPresentation.ts`
- Modify: `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`

- [ ] Normalize a category code by trimming whitespace. For non-empty codes, compute an unsigned 32-bit rolling hash (`hash = (hash * 31 + codePoint) >>> 0`) and use `hash % 360` as the HSL hue. Return light colors using fixed `75%` saturation, `92%` background lightness, and `30%` text lightness; return dark colors using `55%` saturation, `24%` background lightness, and `84%` text lightness.
- [ ] Return the current blue presentation only when the category code is missing or blank. Every non-empty unregistered code receives its deterministic HSL presentation.
- [ ] Replace the inline fixed-blue `sx` values on the notice category Chip with the resolved values. Keep the label `item.state`, `isNotice`, and all filtering and interaction logic untouched.
- [ ] Run the focused tests from Task 1 and confirm the new unit and rendered tests pass.

Expected: PASS; the same category code has stable colors, distinct tested codes have distinct hues, absent codes retain the current blue style, and the API/data contract is unchanged.

## Task 3: Complete focused verification and document the result

**Files:**
- Verify: `frontend/tests/notice-category-presentation.test.ts`
- Verify: `frontend/tests/notice-page.test.tsx`
- Create/update: the dated spec and result paths in the file map.

- [ ] Run the two focused test files without a name filter:

```powershell
Set-Location frontend
npx vitest run tests/notice-category-presentation.test.ts tests/notice-page.test.tsx
```

- [ ] Run `npm run build` from `frontend`.
- [ ] Run Problems validation for `NoticeFeedList.tsx`, the resolver, and both test files; run `git diff --check`.
- [ ] Record the exact test/build results in the result document. Do not add database migration, API fields, or common-code management UI.
