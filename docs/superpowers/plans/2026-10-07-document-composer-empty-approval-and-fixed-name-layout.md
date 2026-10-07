# Document Composer Empty Approval and Fixed Name Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent an already assigned drafter from reappearing in any role selector, make all empty approval-slot regions visually blank, and give the fixed drafter enough name width to avoid the observed clipping.

**Architecture:** Normalize candidate user IDs at the existing `DraftFormUserOption` to `F1GridUserOption` boundary, allowing the current ID-based assigned-user filtering and selection handlers to operate consistently. Keep empty-slot geometry and accessibility labels while removing visible placeholder strings. Give a fixed approver's text row only the sequence and name columns, while preserving the delete column for removable participants.

**Tech Stack:** React, TypeScript, MUI, Vitest, React Testing Library, Vite

---

## File Map

- Modify `docs/directions/20261007/20261007_007_문서작성_결재단계_중복방지_초기결재자_작업지시서.md` to specify exclusion across all roles, all-empty slots, and readable fixed drafter text.
- Modify `docs/plan/20261007/20261007_007_문서작성_결재단계_중복방지_초기결재자_계획서.md` with the additional correction and its validation steps.
- Modify `docs/spec/20261007/20261007_007_문서작성_결재단계_중복방지_초기결재자_사양서.md` with normalized identity matching, blank slot content, and fixed-name layout rules.
- Modify `frontend/tests/document-write-page.test.tsx` to cover padded ID normalization, candidate exclusion in both selectors, blank labels, and fixed participant width.
- Modify `frontend/src/pages/groupware/documents/write/hooks/useDocumentComposer.ts` to trim candidate IDs when converting draft-form user options.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx` to remove all empty-slot text and avoid reserving delete width for fixed participants.
- Modify `docs/result/20261007/document-composer-approval-stage/20261007_007_문서작성_결재단계_중복방지_초기결재자_결과.md` with the latest results and refreshed privacy-safe screenshots.

## Task 1: Update dated requirements and plan

- [x] Update the direction and spec: once assigned as the fixed drafter, the same normalized `userId` is unavailable to approval, agreement, and reference selectors; empty position, seal, and name regions render no visible text; fixed drafter names use the available cell width.
- [x] Update the dated plan with failing-test-first steps for padded IDs, all three blank regions, and fixed approver name layout.
- [x] Retain ID-based equality; explicitly reject display-name filtering so same-name coworkers remain selectable when their IDs differ.

## Task 2: Add regression tests and verify RED

**File:** `frontend/tests/document-write-page.test.tsx`

- [x] Add a test with a candidate based on `composerUser` but `userId: ' emp-1 '`, while the profile has `userId: 'emp-1'`. Open the composer, confirm the fixed first approver is present, open the next approval picker and the reference picker, and assert neither list contains the signed-in account option. The current code should fail because `toUserOption` preserves the candidate's surrounding spaces while the profile ID is trimmed.
- [x] In the empty-slot test, retain the accessible labels and assert all visible placeholders are absent:

```tsx
expect(within(emptySlot).queryByText('직위/직함')).not.toBeInTheDocument();
expect(within(emptySlot).queryByText('도장')).not.toBeInTheDocument();
expect(within(emptySlot).queryByText('이름')).not.toBeInTheDocument();
```

- [x] In the fixed first-approver test, inspect the name Typography and its parent row:

```tsx
const approverName = within(firstApprover).getByText('홍길동');
expect(approverName).not.toHaveStyle({ maxWidth: '3em' });
expect(approverName.parentElement).toHaveStyle({
  gridTemplateColumns: '20px minmax(0, 1fr)',
});
```

- [x] Run `npx vitest run tests/document-write-page.test.tsx -t "normalizes drafter identity|complete dashed empty approval|adds the signed-in user" --testTimeout=15000` from `frontend`. Before implementation, the padded-ID option remained selectable, the empty slot exposed visible `도장`, and the fixed-width assertion detected the existing 3em restriction.

## Task 3: Implement normalized identity and blank empty slots

**Files:** `frontend/src/pages/groupware/documents/write/hooks/useDocumentComposer.ts`, `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx`

- [x] Normalize the candidate ID in `toUserOption`:

```ts
function toUserOption(user: DraftFormUserOption): F1GridUserOption {
  return {
    value: user.userId.trim(),
    label: user.userNm,
    avatarUrl: user.profileImage,
    positionName: user.levelNm,
    departmentName: user.departmentNm,
  };
}
```

- [x] Keep existing `assignedApprovalUserIds`, `approvalOptions`, `referenceOptions`, and event-handler safeguards ID-based. Do not add name matching or alter backend/API contracts.
- [x] Keep the empty-slot title/seal/name elements and accessibility labels, but remove the visible text from all three. Preserve the `32px 64px 32px` row template, separator lines, and dashed outer border.

## Task 4: Give the fixed approver its available name width

**File:** `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx`

- [x] Select the text-row grid columns by fixed status:

```tsx
gridTemplateColumns: isFixed
  ? '20px minmax(0, 1fr)'
  : '20px minmax(0, 1fr) 24px',
```

- [x] Remove `maxWidth: '3em'` from the fixed approver name Typography. Keep the existing one-line ellipsis behavior for labels that genuinely exceed the available column width; removable participants retain their cap.
- [x] Verify removable approvals still render the delete button in the third column and fixed approvals render no delete button or reserved third column.
- [x] Run the Task 2 test selector again. Every targeted regression assertion passes.

## Task 5: Validate all requested behavior

- [x] Run `npx vitest run tests/document-write-page.test.tsx --testTimeout=15000` from `frontend`: 39/39 tests pass.
- [x] Run the focused `npm run lint -- ...` and `git diff --check`: both succeed.
- [x] Run `npm run build` from `frontend`: TypeScript and Vite production build succeed.
- [x] In the browser, check 375px, 768px, and 1280px. The drafter's text width fits at all three sizes (65/65px, 62/62px, and 61/61px); no document-level horizontal overflow was observed. ID-based selector exclusions and blank placeholders are covered by regression tests.
- [x] Refresh the three privacy-safe screenshots and update the dated result report with the cause, implementation, exact test/build/lint results, and viewport checks.

## Self-review

- The normalized identity test exercises the profile-vs-candidate boundary and all role selectors without hiding same-name users.
- Empty-slot semantics remain accessible while all visible placeholder text is removed.
- Fixed participants gain only the unused delete-button width and lose the arbitrary 3em cap; removable participant layout and action remain unchanged.
- Every requested visual and selection rule maps to a test and a browser check.
