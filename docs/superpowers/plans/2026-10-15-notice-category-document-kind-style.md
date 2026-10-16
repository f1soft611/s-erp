# Notice Category Document-Kind Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle notice-category chips as saturated filled badges like document-kind chips while preserving stable, distinct category colors and existing notice behavior.

**Architecture:** Keep category identity and hue selection in `noticeCategoryPresentation.ts`. Use theme-specific saturated backgrounds and let the active MUI theme choose contrast text in `NoticeFeedList`. Tests cover both the pure presentation rules and the rendered chips; the backend/data contract stays untouched.

**Tech Stack:** React, TypeScript, MUI, Vitest, React Testing Library.

---

## Approved requirements

Follow-up approved and executed on 2026-10-15: assert and apply `height: 28`, `borderRadius: '8px'`, and white foreground for `item.state === '필독'` on the existing feed Chip. Other categories retain theme-derived foreground. This applies equally to the notice feed and shared detail rendering. The light/dark regression was observed failing before implementation, then all 10 focused category tests and the frontend build passed.

Implementation compatibility note: use comma-separated CSS HSL strings (`hsl(hue, 75%, 42%)` and `hsl(hue, 65%, 55%)`) in implementation and regex expectations below. The installed MUI contrast helper parses HSL using commas; space-separated equivalents produce invalid luminance calculations. Saturation/lightness and the approved appearance are unchanged.

Follow [the dated work direction](../../directions/20261015/20261015_012_공지분류_문서구분_스타일_통일_작업지시서.md), [the detailed specification](../../spec/20261015/20261015_012_notice_category_document_kind_style_spec.md), and [the approved design](../specs/2026-10-15-notice-category-document-kind-style-design.md). Keep the trimmed category-code hash unchanged; use `hsl(hue 75% 42%)` in light mode and `hsl(hue 65% 55%)` in dark mode, use `#1d4ed8` / `#60a5fa` for missing-code fallback, and derive foreground color from `theme.palette.getContrastText(backgroundColor)`.

## File map

- Modify `frontend/src/pages/groupware/community/notice/data/noticeCategoryPresentation.ts`: return the saturated background and theme-specific fallback without changing the hash algorithm.
- Modify `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`: use MUI theme contrast text for the category chip.
- Modify `frontend/tests/notice-category-presentation.test.ts`: assert exact saturated HSL formats, deterministic code behavior, and primary fallbacks.
- Modify `frontend/tests/notice-page.test.tsx`: render with light/dark app themes and assert background/color contrast, labels, and unchanged pin-state UI.
- Create `docs/result/20261015/notice-category-document-kind-style/20261015_012_notice_category_document_kind_style_result.md`: record tests, build, Problems, diff, and browser outcome.

## Task 1: Update focused tests first

**Files:**
- Modify: `frontend/tests/notice-category-presentation.test.ts`
- Modify: `frontend/tests/notice-page.test.tsx`

- [ ] **Step 1: Assert the new presentation contract**

In `notice-category-presentation.test.ts`, replace the old pastel color assertions with these expectations:

```ts
expect(first.backgroundColor).toMatch(/^hsl\(\d+ 75% 42%\)$/);
expect(first).toEqual(repeated);
expect(
  getNoticeCategoryPresentation('NOTICE_A', true).backgroundColor,
).toMatch(/^hsl\(\d+ 65% 55%\)$/);
```

For absent, null, empty, and whitespace-only codes, assert `{ backgroundColor: '#1d4ed8' }` in light mode and `{ backgroundColor: '#60a5fa' }` in dark mode. Keep the representative distinct-code and unknown-code assertions, comparing their backgrounds.

- [ ] **Step 2: Assert themed rendered chips**

In the existing parameterized category rendering test in `notice-page.test.tsx`, import `ThemeProvider` and `createAppTheme`, then render the notice list inside `ThemeProvider` with `createAppTheme(isDark ? 'dark' : 'light')`. Keep the existing category labels and pinned/unpinned button assertions. Assert that the two computed backgrounds differ and that each chip's computed text color matches `createAppTheme(...).palette.getContrastText()` for its `getNoticeCategoryPresentation(code, isDark).backgroundColor`.

- [ ] **Step 3: Run the focused tests and verify the intended failure**

Run from `frontend`:

```powershell
npx vitest run tests/notice-category-presentation.test.ts tests/notice-page.test.tsx --testNamePattern="category"
```

Expected before implementation: FAIL because the resolver still returns pastel colors and the rendered chip still uses its resolver-provided foreground rather than MUI theme contrast text.

## Task 2: Implement filled category presentation

**Files:**
- Modify: `frontend/src/pages/groupware/community/notice/data/noticeCategoryPresentation.ts`
- Modify: `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`

- [ ] **Step 1: Update the presentation result and fallback**

Keep the existing function signature:

```ts
export function getNoticeCategoryPresentation(
  noticeGubunCode: string | null | undefined,
  isDark: boolean,
): NoticeCategoryPresentation
```

Keep the existing trim, unsigned rolling hash, and `hash % 360`. Have `NoticeCategoryPresentation` contain only `backgroundColor`. Return `#1d4ed8` for missing/blank codes in light mode and `#60a5fa` in dark mode. For a non-empty code return the existing hash hue in `hsl(hue 75% 42%)` for light mode and `hsl(hue 65% 55%)` for dark mode.

- [ ] **Step 2: Set theme-derived contrast text on the chip**

In the category `Chip` in `NoticeFeedList.tsx`, retain `label={item.state}`, `size="small"`, and `fontWeight: 700`. Replace `color: categoryPresentation.color` with:

```tsx
color: (theme) =>
  theme.palette.getContrastText(categoryPresentation.backgroundColor),
```

Keep the resolver's `backgroundColor` as the chip background. Do not change filters, important-notice markers, pin controls, labels, or chip geometry.

- [ ] **Step 3: Run the focused tests**

Run from `frontend`:

```powershell
npx vitest run tests/notice-category-presentation.test.ts tests/notice-page.test.tsx --testNamePattern="category"
```

Expected: PASS for light/dark fills, missing-code fallback, theme-derived foreground, distinct category colors, existing labels, and pin-state UI.

## Task 3: Complete regression verification and documentation

**Files:**
- Verify: `frontend/tests/notice-category-presentation.test.ts`
- Verify: `frontend/tests/notice-page.test.tsx`
- Create: `docs/result/20261015/notice-category-document-kind-style/20261015_012_notice_category_document_kind_style_result.md`

- [ ] **Step 1: Run both focused test files without a name filter**

Run from `frontend`:

```powershell
npx vitest run tests/notice-category-presentation.test.ts tests/notice-page.test.tsx
```

Expected: all tests in the two files pass; if an unrelated pre-existing test fails, record the exact test and failure without broadening the change.

- [ ] **Step 2: Build and check diagnostics**

Run from `frontend`:

```powershell
npm run build
```

Run Problems validation for the presentation helper, feed component, and both tests. Resolve any diagnostics caused by this change.

- [ ] **Step 3: Check whitespace and browser rendering**

Run from the repository root:

```powershell
git diff --check
```

Use the already-running S-ERP browser at `http://127.0.0.1:4173` if the notice page can load its data. Confirm visually that at least two category chips have solid distinct fills and remain readable in the available theme. If API/authentication errors prevent the page from rendering notices, do not alter server processes; record the exact limitation and rely on the focused rendered tests.

- [ ] **Step 4: Record evidence**

Create the result document with the exact test/build/diagnostic outcomes, browser viewport/theme and screenshot path if captured, or a clear explanation if browser rendering was blocked. State explicitly that labels, filtering, important-notice behavior, API, and DB were unchanged.

## Self-review

- Spec requirements 1–8 are covered by Tasks 1–2: stable trimmed code hue, saturated light/dark backgrounds, contrast text, themed fallback, unknown code support, and unchanged notice behavior/data contract.
- Task 3 verifies the complete focused suite, build, diagnostics, diff, and actual browser rendering when data is available.
- Test imports, component helper name, function signature, and presentation property names match the existing codebase.
