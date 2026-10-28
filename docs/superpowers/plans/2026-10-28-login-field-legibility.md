# Login Field Legibility Implementation Plan

> **For agentic workers:** Use executing-plans to carry out this plan task-by-task. Preserve unrelated worktree changes and do not modify authentication behavior.

**Goal:** Improve login form readability with fixed labels, larger input text and balanced spacing.

**Architecture:** Keep `LoginForm` values, callbacks and authentication flow unchanged. Update the existing shared `LoginFormField` wrapper to render a properly associated label above its MUI TextField, set explicit control typography/height, and remove MUI's default vertical field margin.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Vite, Playwright.

---

## File map

- Modify `frontend/src/shared/components/LoginFormField.tsx`: render an external label connected with a stable React `useId`, set 18px input text and 56px control height, remove the default TextField margin.
- Modify `frontend/src/pages/auth/components/LoginForm.tsx`: modestly tighten the field stack and reduce the development-account notice's visual prominence without changing its text or DEV condition.
- Create `frontend/tests/login-form-field.test.tsx`: verify accessible label association, input typography, and control height.
- Update `docs/directions/20261028/20261028_005_login-page-design_작업지시서.md`, `docs/plan/20261028/20261028_005_login-page-design_계획서.md`, `docs/spec/20261028/20261028_005_login-page-design_상세사양서.md`, and `docs/result/20261028/login-page-design/20261028_005_login-page-design_결과.md`.

## Task 1: Write focused failing field tests

**Files:**
- Create: `frontend/tests/login-form-field.test.tsx`
- Test: `frontend/src/shared/components/LoginFormField.tsx`

- [x] Render `LoginFormField` with `label="사용자 ID"` and a controlled value.
- [x] Assert `screen.getByLabelText('사용자 ID')` returns the input and that a visible text label appears before its control.
- [x] Verify in the browser that the input uses 18px text and its root is 56px tall; CSS-in-JS dimensions are not asserted in JSDOM.
- [x] Run `Set-Location frontend; npx vitest run tests/login-form-field.test.tsx`. The fixed-label test failed against the original floating label.

## Task 2: Implement the field label and control sizing

**Files:**
- Modify: `frontend/src/shared/components/LoginFormField.tsx`

- [x] Use React `useId()` to create a per-instance ID, render a MUI `Typography` label with `component="label"` and `htmlFor`, then render the `TextField` with the matching `id` and no floating label.
- [x] Keep existing `value`, `onChange`, `error`, `helperText`, `endAdornment`, autocomplete props, focus and error colors.
- [x] Explicitly set `margin="none"` so theme `TextField` default `margin: 'normal'` does not add extra vertical whitespace.
- [x] Set the outlined input root to 56px minimum height and input font size to 18px; retain responsive width and existing theme text colors.
- [x] Run `Set-Location frontend; npx vitest run tests/login-form-field.test.tsx`. The field test passes.

## Task 3: Refine login form spacing and developer hint

**Files:**
- Modify: `frontend/src/pages/auth/components/LoginForm.tsx`

- [x] Set the form Stack spacing to 1.5 to complement the fixed labels and helper text while reducing excessive separation.
- [x] Keep the existing DEV-only account notice and exact message, but use compact padding, muted divider/background and smaller supporting typography. Do not copy test credentials into screenshots or new docs.
- [x] Run `Set-Location frontend; npx vitest run tests/login-form-field.test.tsx tests/auth-layout.test.tsx`. Both focused component tests pass.

## Task 4: Validate and document

**Files:**
- Update: `docs/result/20261028/login-page-design/20261028_005_login-page-design_결과.md`
- Browser output: `docs/result/20261028/login-page-design/screenshots/`

- [x] Run `Set-Location frontend; npx vitest run tests/login-form-field.test.tsx tests/auth-layout.test.tsx`.
- [x] Run `Set-Location frontend; npm run build`.
- [x] Run Oxlint on the changed UI/test files.
- [x] Reuse the S-ERP server on `http://127.0.0.1:4173`; verify 375px, 768px and 1280px in both themes for readable labels/input text, no horizontal overflow, and focused input appearance.
- [x] Update the result report with the new implementation and verification evidence. Keep the known pre-existing failures in `login.test.tsx` noted separately.
- [x] Run `git diff --check` and confirm no unrelated dirty files were staged or modified by this task.
