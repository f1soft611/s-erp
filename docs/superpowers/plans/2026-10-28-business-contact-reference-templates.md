# Business Contact Reference Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable, reference-only templates to the business-contact composer while preserving the existing approval-line settings workflow.

**Architecture:** Add an explicit mode to the existing settings dialog so it can reuse the current template CRUD and draft/apply/cancel lifecycle while omitting approval stages in business-contact mode. Add a button beside the composer reference field, and reject legacy code-008 templates containing approval/agreement entries instead of silently applying only part of them. No API or database changes are planned.

**Tech Stack:** React, TypeScript, MUI, F1-Grid user selector, Vitest/Testing Library, Vite, Playwright/browser verification.

---

## File Map

| File | Responsibility |
|---|---|
| `frontend/src/pages/groupware/documents/write/components/DocumentReferenceField.tsx` | Reference input and a responsive, optional settings-button slot. |
| `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx` | Open the existing settings dialog from either document kind and pass its mode. |
| `frontend/src/pages/groupware/documents/write/components/DocumentApprovalSettingsDialog.tsx` | Reuse the dialog for approval editing or reference-only template management; retain its existing API and isolated draft state. |
| `frontend/tests/document-approval-settings-dialog.test.tsx` | Cover reference-mode visibility, save/load, legacy-template rejection, apply/cancel, and approval-mode regression. |
| `frontend/tests/document-write-page.test.tsx` | Cover the business-contact reference-field entry point, 40px control alignment, and dialog integration without changing drafting behavior. |
| `docs/directions/20261028/20261028_011_business_contact_reference_templates_작업지시서.md` | Record the approved implementation scope and acceptance checks before implementation. |
| `docs/spec/20261028/20261028_011_business_contact_reference_templates_상세사양서.md` | Date-aligned implementation specification, linked to the approved design. |
| `docs/plan/20261028/20261028_011_business_contact_reference_templates_계획서.md` | Repository-standard dated plan index linking to this detailed task plan. |
| `docs/result/20261028/business-contact-reference-templates/20261028_011_business_contact_reference_templates_결과.md` | Record behavior, verification, and screenshot evidence. |
| `docs/result/20261028/business-contact-reference-templates/screenshots/` | Store responsive browser screenshots at 375px, 768px, and 1280px. |

No backend, API service, database, or template type changes are expected. If code inspection shows the existing template contract cannot safely distinguish valid reference-only templates, stop and revise the design/plan before changing the contract.

## Task 1: Prepare dated implementation records

**Files:**
- Create: `docs/directions/20261028/20261028_011_business_contact_reference_templates_작업지시서.md`
- Create: `docs/spec/20261028/20261028_011_business_contact_reference_templates_상세사양서.md`
- Modify: `docs/plan/20261028/20261028_011_business_contact_reference_templates_계획서.md`
- Source: `docs/superpowers/specs/2026-10-28-business-contact-reference-templates-design.md`

- [x] **Step 1: Record the approved scope in the direction**

  Include the reference-field button, reference-only mode in the existing dialog, unchanged draft/apply/cancel semantics, code `008`, rejection of mixed legacy templates, no API/DB changes, and responsive/browser acceptance criteria. Link to the approved design and do not add unapproved behavior.

- [x] **Step 2: Write the date-aligned detailed spec**

  Translate the approved design into explicit UI labels, mode visibility, input/output behavior, mixed-template error behavior, and testable acceptance criteria. Link back to the design and direction using paths relative to `docs/spec/20261028`.

- [x] **Step 3: Add the repository-standard dated plan index**

  Record the goal, affected frontend files, no-backend/no-DB scope, verification commands, and link to this detailed plan using a relative path from `docs/plan/20261028`.

- [x] **Step 4: Review the three records for consistency**

  Confirm that the direction, dated spec, dated plan index, and approved design all describe the same scope and preserve the legacy mixed-template rejection rule.

## Task 2: Add responsive reference-field entry point

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentReferenceField.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Add a failing business-contact entry-point test**

  Extend the existing composer test that asserts the business-contact reference field. Verify that it contains the `자주 쓰는 참조자` button and that clicking it opens the existing settings dialog. Assert that the reference input root, template button, and the approval field controls use 40px height. Also assert that the drafting tab continues to expose its existing `결재선 설정` button.

- [x] **Step 2: Run the targeted test and verify the missing behavior**

  Run from `frontend`: `npm run test -- tests/document-write-page.test.tsx -t "business-contact reference settings"`

  Expected: the new business-contact assertion fails because the field does not yet expose the button; existing relevant drafting assertions remain passing.

- [x] **Step 3: Add the optional field action**

  Extend `DocumentReferenceField` props with an optional `onOpenSettings?: () => void` and optional disabled state. Render a button labeled `자주 쓰는 참조자` only when the callback is supplied. Keep the text field usable when no callback is supplied by other callers.

  Use a wrapping flex layout around the selector and button: at narrow widths the selector takes a full row and the button may wrap below; at `sm` and wider widths the selector can shrink with `minWidth: 0` while the button stays beside it. Set the reference selector's `.MuiInputBase-root` to `height: 40px; boxSizing: border-box` and its button to `height: 40px; minHeight: 40px`; retain the existing 40px approval selector and action controls. Preserve the existing label and selected-reference order.

- [x] **Step 4: Wire the composer to the existing dialog**

  Track the settings mode alongside the existing open/session state. Keep the existing approval-settings opener for drafting. Add a reference-settings opener used only by the business-contact `DocumentReferenceField`, set the mode to reference, and pass that mode to the same `DocumentApprovalSettingsDialog`.

- [x] **Step 5: Run the targeted test**

  Run from `frontend`: `npm run test -- tests/document-write-page.test.tsx -t "business-contact reference settings"`

  Expected: the reference button opens the reference-named dialog; the drafting approval-settings button remains available under its original label.

## Task 3: Implement reference-only dialog mode

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalSettingsDialog.tsx`
- Test: `frontend/tests/document-approval-settings-dialog.test.tsx`

- [x] **Step 1: Add failing reference-mode rendering and save tests**

  Extend `renderSettings` with an optional mode defaulting to approval. Add a reference-mode test that provides no approval stages, confirms `결재 단계`, `결재자 및 합의자 변경`, `결재 추가`, and `합의 추가` are absent, and confirms the reference selector and `자주 쓰는 참조자 저장` are present. Add a save test that expects `createApprovalLineTemplate` to receive document code `008` and only `REFERENCE` lines preserving selection order.

- [x] **Step 2: Run the targeted tests and verify failure**

  Run from `frontend`: `npm run test -- tests/document-approval-settings-dialog.test.tsx -t "reference-only"`

  Expected: reference-mode tests fail because the dialog does not yet accept or render a reference-only mode.

- [x] **Step 3: Add a backwards-compatible mode prop**

  Add `mode?: 'approval' | 'reference'` to `DocumentApprovalSettingsDialogProps`, defaulting to `'approval'`. In reference mode, hide the approval-stage list and the approval/agreement user editor. Keep the reference selector and existing template manager available. In `handleApply`, send an empty stage list with the selected references in reference mode; in approval mode preserve the existing cloned stages and references.

- [x] **Step 4: Adapt terminology without changing approval mode**

  Derive labels from the mode. In reference mode use dialog title `참조자 설정`, a reference-only description, `자주 쓰는 참조자` for save/list controls, and reference-specific validation/error text. Keep all current approval-mode strings unchanged. Ensure the template grid and rename/delete confirmation actions remain usable in either mode.

- [x] **Step 5: Save only references in reference mode**

  When saving in reference mode, call the existing `createApprovalLineTemplate` with `eabusNo: '008'` (the composer-provided code) and only the ordered reference participants. Do not serialize approval stages, add a new API, or change the service/type contract. Preserve existing duplicate-name handling and CRUD error display.

- [x] **Step 6: Run dialog-mode tests and existing approval tests**

  Run from `frontend`: `npm run test -- tests/document-approval-settings-dialog.test.tsx`

  Expected: reference-mode visibility/save behavior passes and all existing approval-mode save, load, rename, delete, apply, and cancel tests remain passing.

## Task 4: Reject mixed legacy templates atomically

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalSettingsDialog.tsx`
- Test: `frontend/tests/document-approval-settings-dialog.test.tsx`

- [x] **Step 1: Add failing tests for valid and invalid reference templates**

  In reference mode, mock a template containing only ordered `REFERENCE` entries and verify that loading stages only in the dialog draft until `적용` is clicked. Mock a second template containing an `APPROVAL` or `AGREEMENT` entry alongside references; verify that clicking its apply/load action shows an explicit error and does not change the draft references or close the manager as if loading succeeded.

- [x] **Step 2: Run the targeted tests and verify failure**

  Run from `frontend`: `npm run test -- tests/document-approval-settings-dialog.test.tsx -t "reference-only template"`

  Expected: the mixed-template case currently loads the non-reference participant rather than rejecting the template.

- [x] **Step 3: Validate all entries before changing reference-mode draft state**

  In the template load handler, after validating template ID and document code and before calling draft setters, when mode is `'reference'`, require every participant to have `participantType === 'REFERENCE'`. Throw a clear reference-template error if any entry is approval or agreement. Do not filter the mixed template or partially update state.

- [x] **Step 4: Apply the validated reference list to draft state only**

  For a valid reference-only template, map participant IDs in stored order to the current user options. Reject missing or duplicate users before any state update. Update only draft references, clear pending delete state, and close the manager as the existing successful-load flow does. Keep the current approval-mode conversion path unchanged.

- [x] **Step 5: Run the targeted regression tests**

  Run from `frontend`: `npm run test -- tests/document-approval-settings-dialog.test.tsx`

  Expected: valid reference-only templates apply in the modal, mixed/invalid templates report an error without partial state changes, and all existing approval-template tests pass.

## Task 5: Integrate, validate, and document results

**Files:**
- Test: `frontend/tests/document-approval-settings-dialog.test.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`
- Create: `docs/result/20261028/business-contact-reference-templates/20261028_011_business_contact_reference_templates_결과.md`
- Create: `docs/result/20261028/business-contact-reference-templates/screenshots/`

- [x] **Step 1: Run focused frontend tests**

  Run from `frontend`: `npm run test -- tests/document-approval-settings-dialog.test.tsx tests/document-write-page.test.tsx`

  Result: reference-template and composer integration tests passed (5/5); approval sizing and entry-point tests passed (2/2). The full settings-dialog file had 37 passing tests and one unrelated existing inline Grid-rename failure (`preserves failed inline renames after partial batch failure for retry`).

- [x] **Step 2: Run the frontend build**

  Run from `frontend`: `npm run build`

  Expected: TypeScript and Vite production build complete without errors.

- [x] **Step 3: Check whitespace and scope**

  Run from repository root: `git diff --check`

  Review `git status --short` and the relevant diffs. Preserve all unrelated pre-existing staged and unstaged changes; do not stage or commit unrelated files.

- [x] **Step 4: Verify the browser-test server**

  Check whether `http://127.0.0.1:4173` is already serving this S-ERP workspace. Reuse it if so. If no server is running, start `npm run dev -- --strictPort` from `frontend`, verify it responds at port 4173, and stop only the server started for this test after browser checks.

- [x] **Step 5: Verify the actual responsive UI**

  Use a browser to open the composer, select 업무연락, inspect the reference-field action and reference-only dialog, and capture screenshots at 375px, 768px, and 1280px. Confirm the button/input do not overlap, the dialog remains reachable, and no page-level horizontal overflow is introduced. Also open the drafting settings and confirm its approval stages remain visible.

- [x] **Step 6: Write the result record**

  Record changed behavior, confirmation that no backend/API/DB contract changed, the focused test and build results, browser viewports checked, and relative links to the three screenshots. Store screenshots only in the English-named result directory above.

- [x] **Step 7: Review all acceptance criteria**

  Verify every criterion in `docs/superpowers/specs/2026-10-28-business-contact-reference-templates-design.md` against tests, browser evidence, or the result record. Do not claim completion if any criterion is unverified.

## Plan Self-Review

- **Spec coverage:** The entry point and responsive layout are in Task 2; mode visibility, labels, save and draft/apply/cancel semantics are in Task 3; valid/mixed template behavior is in Task 4; approval regression, browser screenshots, and result documentation are in Task 5. Task 1 supplies dated records required by the repository.
- **Placeholder scan:** All steps name specific files, behaviors, commands, and expected results. No placeholder instructions or unspecified test-writing steps remain.
- **Type consistency:** The dialog mode is `'approval' | 'reference'`, defaults to `'approval'`, and is passed from the composer. Existing callback types remain `(approvalStages, referenceUserIds)`; reference mode passes an empty stage array. The existing document-code type and service contract remain unchanged.
