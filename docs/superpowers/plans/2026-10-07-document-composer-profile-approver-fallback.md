# Document Composer Profile-Based First Approver Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure the signed-in user is always initialized as the protected first approver using profile data when absent from the selectable candidate list, and leave empty title slots visually blank.

**Architecture:** Keep the existing profile and draft-option requests. Prefer an exact `userId` match from candidate options; otherwise construct only the fixed first-stage option from profile identity and display fields without changing candidate choices. Keep the existing approval-slot grid dimensions and remove only its visible title placeholder.

**Tech Stack:** React, TypeScript, MUI, Vitest, React Testing Library, Vite

---

## File Map

- Modify `docs/directions/20261007/20261007_007_문서작성_결재단계_중복방지_초기결재자_작업지시서.md` to correct the approved first-approver rule.
- Modify `docs/plan/20261007/20261007_007_문서작성_결재단계_중복방지_초기결재자_계획서.md` with this follow-up execution sequence.
- Modify `docs/spec/20261007/20261007_007_문서작성_결재단계_중복방지_초기결재자_사양서.md` with profile-backed fallback details and tests.
- Modify `frontend/tests/document-write-page.test.tsx` to replace the obsolete absent-option error expectation and assert the blank title text.
- Modify `frontend/src/pages/groupware/documents/write/hooks/useDocumentComposer.ts` to build the fixed approver from profile data only when no exact candidate match exists.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx` to preserve the empty title row without rendering its text.
- Modify `docs/result/20261007/document-composer-approval-stage/20261007_007_문서작성_결재단계_중복방지_초기결재자_결과.md` with correction and verification results.

## Task 1: Align the dated task documents

- [x] Replace the direction's “profile user missing from options is an error” rule with: a non-empty profile ID/name creates the fixed first approver even when candidate options omit that user; missing ID or name remains an explicit error.
- [x] Update the plan's file map and verification sequence to include a profile-fallback regression test and the blank title assertion.
- [x] Update the spec's initial-stage steps to prefer the exact option and otherwise map profile metadata to the fixed `F1GridUserOption`; preserve the separate candidate list.
- [x] Self-check the direction, plan, and spec for contradictory missing-option behavior and retain the existing uniqueness, fixed-stage, and stage-sequence rules.

## Task 2: Prove both corrections fail before implementation

**Files:** `frontend/tests/document-write-page.test.tsx`

- [x] Replace the test named “shows an error when the signed-in user is missing from the user options” with the profile fallback test below. The setup should exclude `composerUser` from `users`, and the mocked profile should supply `userId: 'emp-profile-only'`, `name: '기안자'`, `departmentName: '기획팀'`, `levelName: '팀장'`, and `profileImage: '/users/profile-only.png'`.

```tsx
it('uses profile details as the fixed first approver when absent from selectable users', async () => {
  composerApi.fetchDraftFormOptions.mockResolvedValue({
    categoryGroup: null,
    categoryItems: [category],
    cycleItems: [],
    users: [anotherComposerUser, thirdComposerUser],
  });
  composerApi.fetchMyProfile.mockResolvedValue({
    userId: 'emp-profile-only',
    name: '기안자',
    departmentName: '기획팀',
    levelName: '팀장',
    profileImage: '/users/profile-only.png',
  });
  render(<DashboardContent {...pageProps} />);

  fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
  await waitForComposerReady();

  const firstApprover = screen.getByRole('group', {
    name: '결재 1 기안자',
  });
  expect(firstApprover).toHaveTextContent('팀장');
  expect(firstApprover).toHaveTextContent('기안자');
  expect(
    within(firstApprover).queryByRole('button', { name: /삭제/ }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText('로그인 사용자를 결재선 사용자 목록에서 찾을 수 없습니다.'),
  ).not.toBeInTheDocument();
});
```

- [x] In the existing complete-empty-approval test, add `expect(within(emptySlot).queryByText('직위/직함')).not.toBeInTheDocument();` while retaining checks for the title-area accessible label, stamp slot, name slot, dashed border, and lack of sequence/removal action.
- [x] Run `npx vitest run tests/document-write-page.test.tsx -t "uses profile details as the fixed first approver|shows a complete dashed empty approval"`. Expected before implementation: the first test renders the missing-user error instead of the first approver, and the second finds visible `직위/직함` text.

## Task 3: Implement the smallest changes

**Files:** `frontend/src/pages/groupware/documents/write/hooks/useDocumentComposer.ts`, `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx`

- [x] Use the matched option first and create the fallback only when `signedInUserId` is non-empty:

```ts
const signedInUser = signedInUserId
  ? availableUsers.find((user) => String(user.value) === signedInUserId) ?? {
      value: signedInUserId,
      label: profile.name.trim(),
      avatarUrl: profile.profileImage,
      positionName: profile.levelName,
      departmentName: profile.departmentName,
    }
  : undefined;
```

- [x] Keep the existing explicit error when the profile lacks a non-empty name or user ID. Do not add the fallback to `userOptions`; the fixed stage must continue to be non-removable and excluded from duplicate-eligible selectors.
- [x] Remove only the text child `직위/직함` from the first `Typography` in the empty-slot branch. Retain its `aria-label`, styles, and the existing three-row grid dimensions.
- [x] Re-run the two tests from Task 2. Expected: both pass and the surrounding empty-slot and fixed-user assertions remain intact.

## Task 4: Validate the correction and update its result record

- [x] Run the targeted regression set:

```powershell
Set-Location frontend
npx vitest run tests/document-write-page.test.tsx -t "uses profile details as the fixed first approver|shows a complete dashed empty approval|adds the signed-in user as a non-removable first approver|prevents the same user|shares one sequence" --testTimeout=15000
```

Expected: all selected tests pass.

- [x] Run changed-file lint and whitespace checks:

```powershell
Set-Location frontend
npm run lint -- src/pages/groupware/documents/write/hooks/useDocumentComposer.ts src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx tests/document-write-page.test.tsx
if ($?) { git -C .. diff --check }
```

Expected: lint exits 0 and `git diff --check` reports no whitespace errors.

- [x] Run `npm run build` from `frontend`. Expected: TypeScript and Vite production build complete successfully.
- [x] Recheck the open composer in the browser at 375px, 768px, and 1280px. Confirm the fixed user is stage 1, there is no missing-user error, blank position/title spaces have no visible label, and the page does not gain horizontal overflow.
- [x] Update the dated result report with the cause, fix, regression coverage, and browser evidence. Keep previously captured screenshots free of identity values; replace them only if the visible title needs a refreshed capture.

## Self-review

- The design's two behavior changes each have a regression assertion before production edits.
- The profile fallback uses fields present in `MyProfile` and `F1GridUserOption`; it does not change API contracts or selector candidates.
- Missing profile identity remains an explicit error, and the original duplicate-prevention, fixed-stage, and numbering tests remain in the focused validation set.
- The blank title text is removed without changing the empty slot's grid sizing or other labels.
