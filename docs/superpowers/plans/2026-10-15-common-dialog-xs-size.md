# CommonDialog Extra-Small Size Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable `xs` size to `CommonDialog` with a 480px maximum width while preserving all existing dialog behavior.

**Architecture:** Extend the existing `CommonDialogSize` union and map `xs` to a 480px paper width through the same viewport-safe inline sizing used for `md` and `lg`. Do not change any caller or the default size.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library.

---

## File map

- Modify `frontend/src/shared/components/CommonDialog.tsx` to expose `xs` and select its 480px maximum width.
- Modify `frontend/tests/common-dialog.test.tsx` to assert the `xs` paper width and preserve existing width and dialog behavior coverage.
- Create `docs/directions/20261015/20261015_020_common_dialog_xs_size_작업지시서.md` with scope and acceptance criteria.
- Create `docs/plan/20261015/20261015_020_common_dialog_xs_size_계획서.md` with the dated implementation sequence and verification commands.
- Create `docs/spec/20261015/20261015_020_common_dialog_xs_size_상세사양서.md` with the size contract and responsive behavior.
- Create `docs/result/20261015/common-dialog-xs-size/20261015_020_common_dialog_xs_size_결과보고서.md` with actual test/build/browser results; add screenshots only when a relevant browser capture is available.

## Task 1: Document the dated requirement before implementation

**Files:**
- Create: `docs/directions/20261015/20261015_019_common_dialog_xs_size_작업지시서.md`
- Create: `docs/plan/20261015/20261015_019_common_dialog_xs_size_계획서.md`
- Create: `docs/spec/20261015/20261015_019_common_dialog_xs_size_상세사양서.md`

- [ ] **Step 1: Record scope and completion criteria in the work direction**

State that this task adds only `size="xs"` to `CommonDialog`, defines its maximum width as 480px, retains the responsive side margins, preserves `md=820px`, `lg=990px`, default `md`, and makes no call-site changes. Define acceptance as a focused test pass and successful frontend build.

- [ ] **Step 2: Record the implementation sequence in the dated plan**

List the test-first change to `frontend/tests/common-dialog.test.tsx`, implementation in `frontend/src/shared/components/CommonDialog.tsx`, focused Vitest command, frontend build command, and result-report path.

- [ ] **Step 3: Define the size contract in the detailed spec**

Specify `CommonDialogSize = 'xs' | 'md' | 'lg'`; `xs` has max width 480px and rendered width `min(480px, calc(100vw - 48px))`. State that existing `md`/`lg` sizing, default size, `fullScreenOnMobile`, and all call sites remain unchanged.

## Task 2: Add the failing `xs` size test

**Files:**
- Modify: `frontend/tests/common-dialog.test.tsx`

- [ ] **Step 1: Add explicit `xs` width coverage**

Add this test next to the existing selected-width test:

```tsx
it('uses the extra-small width when xs is selected', () => {
  render(
    <CommonDialog open title="매우 작은 모달" onClose={vi.fn()} size="xs">
      <p>본문</p>
    </CommonDialog>,
  );

  expect(screen.getByRole('dialog')).toHaveStyle({
    maxWidth: '480px',
    width: 'min(480px, calc(100vw - 48px))',
  });
});
```

Retain the existing default-`md` and `lg` assertions.

- [ ] **Step 2: Run the focused test and confirm the new assertion fails**

Run from `frontend`:

```powershell
npm run test -- tests/common-dialog.test.tsx
```

Expected before implementation: the new assertion fails because `xs` is not mapped and the dialog uses the current `md` width.

## Task 3: Implement the `xs` size

**Files:**
- Modify: `frontend/src/shared/components/CommonDialog.tsx`
- Test: `frontend/tests/common-dialog.test.tsx`

- [ ] **Step 1: Extend the public size type**

Change the type to:

```ts
export type CommonDialogSize = 'xs' | 'md' | 'lg';
```

- [ ] **Step 2: Map the new size without changing existing mappings**

Set the selected maximum width to:

```ts
const maxWidth =
  size === 'xs' ? 480 : size === 'lg' ? 990 : 820;
```

Keep the existing `width: \`min(${maxWidth}px, calc(100vw - 48px))\`` pattern, `size = 'md'`, paper max-height, and mobile full-screen logic unchanged.

- [ ] **Step 3: Re-run the focused test**

Run from `frontend`:

```powershell
npm run test -- tests/common-dialog.test.tsx
```

Expected: all `CommonDialog` tests pass, including `xs`, existing `md`/`lg` widths, surface colors, accessibility, footer layout, and mobile behavior.

## Task 4: Verify and record the result

**Files:**
- Create: `docs/result/20261015/common-dialog-xs-size/20261015_019_common_dialog_xs_size_결과보고서.md`
- Optional: `docs/result/20261015/common-dialog-xs-size/screenshots/` for relevant browser captures only.

- [ ] **Step 1: Run the focused test and frontend build**

From `frontend` run:

```powershell
npm run test -- tests/common-dialog.test.tsx
npm run build
```

Expected: Vitest reports the focused test file passing; TypeScript compilation and the Vite production build succeed.

- [ ] **Step 2: Check responsive behavior in a real browser if a runnable `xs` dialog surface is available**

Check widths at 375px, 768px, and 1280px. Confirm the paper is capped at 480px, maintains the 24px viewport gutters when the viewport is narrower, and does not affect existing dialog behavior. Use the existing shared browser server only if the relevant surface is already available; do not access or alter user data. Save screenshots only if they can be captured and stored through the browser workflow.

- [ ] **Step 3: Write the result report with observed outcomes**

Record the exact test and build results, the implementation contract, whether browser checks were possible, and any actual screenshot paths. Do not report an unperformed browser check or claim screenshots that were not saved.

## Self-review

- Spec coverage: the `xs` API, 480px cap, responsive width, unchanged existing sizes/default/mobile behavior, no caller migration, focused test, build, and result reporting are all represented above.
- Placeholder scan: no TODO, TBD, or unspecified implementation steps remain.
- Type consistency: the plan uses the existing `CommonDialogSize`, `size` prop, `CommonDialog`, and `common-dialog.test.tsx` paths and names.
