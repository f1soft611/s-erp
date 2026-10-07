# Document Composer Identity and Hover Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exclude the authenticated drafter from all other participant pickers using the actual employee identity, and make removable approval/agreement participants deletable through accessible X controls.

**Architecture:** Preserve the profile endpoint's existing `userId` value (`login_code`) and add `employeeId` from the already joined `tb_user.user_id`. The composer will use the normalized employee ID for the fixed participant and all duplicate checks. Removable approval cards will place a Close icon at the right of the title row; agreement chips will replace the delete glyph with the same icon. CSS hover/focus reveals controls on pointing devices, while touch-only devices always show them.

**Tech Stack:** Java 17, Spring Boot/eGovFrame, MyBatis, PostgreSQL, React, TypeScript, MUI, Vitest, React Testing Library, Playwright.

---

## Confirmed project evidence

- The profile mapper at `backend/src/main/resources/egovframework/mapper/let/uat/uia/EgovLoginUsr_SQL_postgresql.xml` currently aliases `li.login_code AS userId`.
- The selectable-user mapper at `backend/src/main/resources/egovframework/mapper/let/co/workflow/form/DraftingWork_SQL_postgresql.xml` returns `u.user_id` as `userId`.
- Read-only PostgreSQL metadata confirms `tb_login_account.login_code` is `character varying` and `tb_user.user_id` is `bigint`. No row data was queried.
- The profile page displays `profile.userId`; changing its meaning would break an existing consumer. Add an independent `employeeId` field instead.
- `useDocumentComposer` creates a fixed stage using profile `userId`, while `DocumentApprovalFields` filters candidates by stage option values. This explains why the previously added whitespace trimming did not exclude the real login: the values are identifiers from different columns.
- The confirmed UI decision is that the fixed first drafter remains non-removable. Other approval and agreement participants can be removed. Touch-only devices show the X controls without hover.
- The existing result and screenshot directory is `docs/result/20261007/document-composer-approval-stage/`. Preserve all unrelated working-tree changes from the earlier task.

## File map

### Dated requirements and results

- Create `docs/directions/20261007/20261007_010_문서작성_기안자_식별_및_호버삭제_작업지시서.md` — approved scope, boundaries, and completion criteria.
- Create `docs/plan/20261007/20261007_010_문서작성_기안자_식별_및_호버삭제_계획서.md` — dated task sequence and validation.
- Create `docs/spec/20261007/20261007_010_문서작성_기안자_식별_및_호버삭제_사양서.md` — response field, identity equality, removal behavior, accessibility, touch fallback.
- Modify `docs/result/20261007/document-composer-approval-stage/20261007_007_문서작성_결재단계_중복방지_초기결재자_결과.md` — append actual implementation and validation evidence.
- Refresh `docs/result/20261007/document-composer-approval-stage/screenshots/approval-stage-{375,768,1280}.png` — use synthetic or blurred identity display only.
- Preserve the approved design at `docs/superpowers/specs/2026-10-07-document-composer-identity-and-hover-removal-design.md`.

### Backend profile contract

- Modify `backend/src/main/java/egovframework/let/uat/uia/domain/model/MyProfileVO.java` — add `Long employeeId`.
- Modify `backend/src/main/resources/egovframework/mapper/let/uat/uia/EgovLoginUsr_SQL_postgresql.xml` — select `u.user_id AS employeeId` in `selectMyProfile`.
- Modify `backend/src/main/java/egovframework/let/uat/uia/web/ProfileSettingsApiController.java` — add `employeeId` to the response map without changing `userId`.
- Modify `backend/src/test/java/egovframework/let/uat/uia/web/ProfileSettingsApiControllerTest.java` — prove both identifiers are independently returned.
- No table/column is created or altered. Therefore no SQL migration, rollback script, or schema-document edit is required.

### Frontend identity and UI

- Modify `frontend/src/pages/dashboard/types/profileSettings.ts` — type the additive profile `employeeId` as `number | string`.
- Modify `frontend/src/pages/groupware/documents/write/hooks/useDocumentComposer.ts` — resolve the signed-in selectable option and fixed fallback by normalized `employeeId`; surface a clear load error if it is missing.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx` — relocate removable approval X controls to the title row; replace the agreement delete glyph with X; implement hover/focus and touch-only visibility.
- Modify `frontend/tests/document-write-page.test.tsx` — cover ID namespace resolution, same-name distinct identities, fixed drafter protection, removal/restoration, close icons, and selector exclusions.
- Modify `frontend/tests/profile-settings.service.test.ts` and `frontend/tests/profile-settings-page.test.tsx` only if making `employeeId` required causes profile fixtures to need the new response field. The profile page must continue displaying the unchanged `userId`.

## Task 1: Create the dated work documents

**Files:** create the direction, then the dated plan, then the detailed spec under the exact paths in the file map.

- [ ] **Step 1: Write the work direction.** State that the authenticated profile has two identifier namespaces, the backend adds only the current user's employee primary key as `employeeId`, the fixed drafter stays protected, and X removal controls are hover/focus-visible on desktops and always visible on touch-only devices. Set scope to the files in this plan; state no schema changes.
- [ ] **Step 2: Write the dated plan after the direction.** Record test-first order: profile contract test, backend response field, composer identity regression tests, UI removal tests, implementation, full targeted validation, screenshots/result report.
- [ ] **Step 3: Write the detailed spec after the dated plan.** Specify `employeeId` originates from `tb_user.user_id`; preserve `userId=login_code`; normalize both compared employee IDs using `String(value).trim()`; never exclude by name. Specify approval X location, agreement X, accessible button labels, fixed participant exclusion, agreement-member removal semantics, and touch fallback.
- [ ] **Step 4: Verify documents contain no contradictions or schema-change claims.** Confirm the direction, plan, and spec all agree that there is no database schema migration.

## Task 2: Add the backend profile contract regression

**File:** `backend/src/test/java/egovframework/let/uat/uia/web/ProfileSettingsApiControllerTest.java`

- [ ] **Step 1: Extend `profileResponseExposesFieldsDirectlyInResult` with a compile-safe RED assertion.** Before the DTO has an employee field, assert:

```java
assertEquals("admin", result.get("userId"));
assertEquals(true, result.containsKey("employeeId"));
```

  The existing response has no `employeeId`, so the second assertion must fail rather than fail compilation.
- [ ] **Step 2: Verify RED.** Run from `backend`: `mvn -Dtest=ProfileSettingsApiControllerTest test`. Expected: `profileResponseExposesFieldsDirectlyInResult` fails because `employeeId` is absent from the response.
- [ ] **Step 3: Add the typed profile field and make the test assert its value.** In `MyProfileVO`, add `private Long employeeId;` and rely on existing Lombok accessors. Set `profile.setUserId("login-code"); profile.setEmployeeId(42L);` in the test and assert `result.get("userId")` remains `"login-code"` and `result.get("employeeId")` is `42L`.
- [ ] **Step 4: Return the existing joined employee key.** In the `selectMyProfile` SELECT list add `u.user_id AS employeeId`. In `ProfileSettingsApiController.profileResult`, add `result.put("employeeId", profile.getEmployeeId());`. Leave `li.login_code AS userId` unchanged.
- [ ] **Step 5: Verify GREEN.** Run `mvn -Dtest=ProfileSettingsApiControllerTest test` from `backend`. Expected: the profile response test passes and verifies both independent identifiers.

## Task 3: Add frontend regression coverage for the true identity

**Files:** `frontend/tests/document-write-page.test.tsx`, profile fixtures in profile settings tests if required.

- [ ] **Step 1: Update test profile factories.** Existing document composer profile mocks must supply employee IDs matching each intended candidate's `userId`; the profile settings service/page mocks must supply an employee ID but continue using `userId` as the login code.
- [ ] **Step 2: Add the mismatched-namespace regression.** Configure a profile fixture with `userId: 'login-code-1'`, `employeeId: 'emp-1'`, and a name matching `composerUser.userNm`. Open the composer and assert the fixed stage carries the employee key and the same employee option is absent from the approval and reference lists:

```tsx
const approvalPicker = screen.getByRole('combobox', {
  name: '결재선 2 사용자 선택',
});
fireEvent.click(approvalPicker);
const approvalListbox = getPickerListbox(approvalPicker);
expect(
  within(approvalListbox).queryByRole('option', { name: /홍길동.*기획팀/ }),
).toBeNull();
fireEvent.keyDown(approvalPicker, { key: 'Escape' });

const referencePicker = screen.getByRole('combobox', { name: '참조자 선택' });
fireEvent.click(referencePicker);
const referenceListbox = getPickerListbox(referencePicker);
expect(
  within(referenceListbox).queryByRole('option', { name: /홍길동.*기획팀/ }),
).toBeNull();
```

  Use the real selector listboxes and existing `getPickerListbox` helper in the test. Add a same-name user in a different department for the control case. Verify agreement uses the same filtered approval selector after adding an agreement stage.
- [ ] **Step 3: Add the same-name control case.** Include a different candidate ID whose `userNm` equals the profile name. After opening the approval and reference selectors, assert that option is present by its distinct department/ID-backed fixture and that only the employee ID is excluded. This proves exclusions use identity, not display name.
- [ ] **Step 4: Add missing-employee-ID coverage.** Return a profile without a usable `employeeId` and assert the composer displays the existing visible loading error area with a specific employee-ID message instead of creating a stage keyed by `login_code`.
- [ ] **Step 5: Run the new frontend tests before implementation.** Run from `frontend`: `npx vitest run tests/document-write-page.test.tsx -t "employee identity|same-name|employee ID" --testTimeout=15000`. Expected: the employee-key exclusion and missing-ID cases fail under the current login-code matching.

## Task 4: Use the employee ID in composer initialization

**Files:** `frontend/src/pages/dashboard/types/profileSettings.ts`, `frontend/src/pages/groupware/documents/write/hooks/useDocumentComposer.ts`.

- [ ] **Step 1: Type the profile field.** Add `employeeId: number | string` to `MyProfile`; keep the existing `userId: string` field and its documented meaning.
- [ ] **Step 2: Normalize identity once at composer initialization.** Replace the profile `userId` match with:

```ts
const signedInEmployeeId = String(profile.employeeId ?? '').trim();
if (!signedInEmployeeId) {
  setLoadError('로그인 사용자의 사원 ID를 확인할 수 없습니다.');
  return;
}
const signedInUser =
  availableUsers.find(
    (user) => String(user.value).trim() === signedInEmployeeId,
  ) ?? {
    value: signedInEmployeeId,
    label: profile.name.trim(),
    avatarUrl: profile.profileImage,
    positionName: profile.levelName,
    departmentName: profile.departmentName,
  };
```

  Keep the existing name validation and use the resulting `signedInUser` as the fixed first stage. Do not add this fallback option to the general candidate list.
- [ ] **Step 3: Verify GREEN.** Run the Task 3 targeted tests. Expected: the account is excluded by employee ID from approval/agreement/reference; a same-name different ID remains available; missing employee ID reports an error.
- [ ] **Step 4: Re-run profile settings tests.** Run `npx vitest run tests/profile-settings.service.test.ts tests/profile-settings-page.test.tsx`. Expected: profile display still uses `userId` and all fixture responses type-check.

## Task 5: Add X removal behavior tests

**File:** `frontend/tests/document-write-page.test.tsx`.

- [ ] **Step 1: Add a removable approval assertion.** Add a non-fixed approval participant and assert its delete action remains accessible as `결재 참여자 <sequence> <name> 삭제`, contains a `CloseIcon`, and is inside the participant title row. Assert the fixed drafter still has no remove button:

```tsx
const removeApproval = within(removableApproval).getByRole('button', {
  name: `결재 참여자 2 ${approvalName} 삭제`,
});
expect(within(removeApproval).getByTestId('approval-remove-icon')).toBeInTheDocument();
expect(within(fixedDrafter).queryByRole('button', { name: /삭제/ })).toBeNull();
```

- [ ] **Step 2: Add an agreement assertion.** Add two agreement users in one group. Assert each button keeps `합의 참여자 <sequence> <name> 삭제`, contains `agreement-remove-icon` rendered by `CloseIcon` rather than the former delete-outline glyph, and both participant badges share one sequence.
- [ ] **Step 3: Assert removal semantics.** Remove one approval and one agreement user; verify approval stage sequence recalculates, the remaining agreement member retains the shared stage sequence, removed IDs return to eligible selectors, and the fixed drafter remains present.
- [ ] **Step 4: Run the targeted tests before UI implementation.** Run `npx vitest run tests/document-write-page.test.tsx -t "X removal|removable approval|agreement participant" --testTimeout=15000`. Expected: assertions for icon and approval title-row placement fail because the existing component uses delete-outline buttons in the lower row/chip.

## Task 6: Implement hover/focus X controls with a touch fallback

**File:** `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx`.

- [ ] **Step 1: Replace the icon import.** Replace `DeleteOutlineOutlinedIcon` with `CloseIcon` from `@mui/icons-material/Close`.
- [ ] **Step 2: Relocate removable approval actions.** Wrap the title/position text and, only when `!isFixed`, its `IconButton` in a 32px title row. Align the button at the top-right, preserve title text truncation, and give the icon button an accessible delete label and small hit-target padding. Do not render or reserve a remove button for the fixed drafter.
- [ ] **Step 3: Add reveal styles to each removable participant container.** Use the participant as a hover/focus group: hide the remove icon at rest on hover-capable devices, show it when the card is hovered or contains keyboard focus, and use `@media (hover: none)` to make the button visible and clickable at all times. Keep the button in keyboard navigation so focus itself reveals it.
- [ ] **Step 4: Replace the agreement action icon.** Keep existing agreement layout and individual removal callback; render `CloseIcon` and apply the same hover/focus/touch visibility behavior to each agreement chip.
- [ ] **Step 5: Verify GREEN.** Run Task 5 tests and the Task 3 identity tests. Expected: all X controls, labels, fixed behavior, user restoration, and sequence assertions pass.

## Task 7: Validate the change and update results

**Files:** dated result report and three existing approval-stage screenshots.

- [ ] **Step 1: Run focused backend tests.** From `backend`, run `mvn -Dtest=ProfileSettingsApiControllerTest test`. Expected: success.
- [ ] **Step 2: Run focused frontend tests.** From `frontend`, run `npx vitest run tests/document-write-page.test.tsx tests/profile-settings.service.test.ts tests/profile-settings-page.test.tsx --testTimeout=15000`. Expected: all selected test files pass.
- [ ] **Step 3: Run lint, build, and diff checks.** From `frontend`, run `npm run lint -- src/pages/dashboard/types/profileSettings.ts src/pages/groupware/documents/write/hooks/useDocumentComposer.ts src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx tests/document-write-page.test.tsx tests/profile-settings.service.test.ts tests/profile-settings-page.test.tsx`; run `npm run build`; from the repository root run `git diff --check`. Expected: all succeed; investigate only failures attributable to this change and preserve unrelated baseline warnings.
- [ ] **Step 4: Verify browser behavior.** At 375px, 768px, and 1280px, check the fixed drafter is unavailable in approval/agreement/reference options; the approval X is at the top-right of its title row; approval/agreement X buttons are hidden at rest and shown on hover/focus in a hover-capable desktop context; touch emulation keeps X buttons visible; deleting a removable participant restores it to candidates; the document has no page-level horizontal overflow.
- [ ] **Step 5: Refresh privacy-safe screenshots.** Save the modal at all three widths to the existing screenshot directory. Blur visible user-identifying labels and input values before capture.
- [ ] **Step 6: Update the result report.** Record the proven root cause (`login_code` versus `user_id`), additive response field, no-schema-change DB MCP evidence, removal behavior, exact command results, responsive results, and screenshot links. Do not include database row data or account identifiers.
- [ ] **Step 7: Final check.** Confirm the worktree diff contains only scoped files and this task's dated docs/results, while preserving earlier unrelated modifications.

## Self-review

- **Spec coverage:** Employee ID contract, preservation of old profile `userId`, fixed first drafter, all-role duplicate exclusion, same-name distinct account, missing identity error, title-row approval X, agreement X, hover/focus visibility, touch fallback, individual removal restoration, sequence recalculation, backend/frontend tests, browser widths, screenshots, and result report are covered above.
- **Placeholder scan:** No TBD/TODO or unspecified implementation decisions remain. The Java field is `Long employeeId`; the frontend accepts `number | string` and normalizes via `String(...).trim()`.
- **Type consistency:** Candidate IDs remain strings in `F1GridUserOption`; backend `employeeId` is `Long`; the frontend profile property accepts numeric JSON or string fixtures and converts to a trimmed string before comparison.
- **Database scope:** Only reads existing `tb_user.user_id`; no database schema change is required, so migration artifacts must not be generated.
