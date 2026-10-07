# 문서작성 결재선 입력 필드 공간 개선 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 결재선을 번호 순서의 가로 다중 선택 필드로 바꾸고, 결재/합의 확정 후 다음 빈 입력을 이어 붙인다.

**Architecture:** `approvalStages`를 확정 단계의 단일 원본으로 유지한다. `DocumentApprovalFields`는 확정 단계를 읽기 전용 `UserSelectEditor` 입력으로 렌더링하고 마지막에 활성 다중 선택 입력 하나를 그린다. 기존 hook의 결재별 사용자 단계와 합의 그룹 단계 로직을 재사용하며 참조선은 독립된 다중 선택 입력으로 유지한다.

**Tech Stack:** React, TypeScript, MUI, shared `UserSelectEditor`, Vitest, Testing Library, Vite.

---

## 파일 책임

- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx`: 확정 단계 입력들, 단계별 role/번호/삭제, 마지막 활성 입력 및 role별 확정 액션, 로컬 가로 스크롤.
- Reuse `frontend/src/pages/groupware/documents/write/hooks/useDocumentComposer.ts`: `approvalStages`, `selectedApprovalUserIds`, `addApproval`, `addAgreement`, `removeApprovalStage`가 확정 상태와 입력 리셋을 소유한다. 검증에서 상태 누락이 드러나지 않으면 수정하지 않는다.
- Modify `frontend/src/shared/components/f1-grid/editing/UserSelectEditor.tsx`: `readOnly`일 때 선택 칩의 삭제 affordance도 차단한다. 기존 default 및 편집 가능 소비자 동작은 바꾸지 않는다.
- Modify `frontend/tests/document-write-page.test.tsx`: active field labels, read-only committed fields, 다음 필드 생성, 사용자 순서/그룹, 후보 복원, reference isolation, scroll containment 회귀 테스트.
- Modify `frontend/tests/user-select-editor.test.tsx`: 공통 선택기 opt-in 동작과 read-only 칩 삭제 차단을 검증한다.
- Update dated spec and create result report/screenshots after implementation.

## Task 1: Write failing sequential-field tests

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`
- Modify: `frontend/tests/user-select-editor.test.tsx`

- [x] **Step 1: Update the active approval field test**

문서작성 모달에 처음 진입하면 활성 선택기는 `결재선 1 사용자 선택`으로 표시되고, 빈 입력의 결재/합의 액션은 비활성 상태인지 테스트한다.

```tsx
const firstApprovalPicker = screen.getByRole('combobox', {
  name: '결재선 1 사용자 선택',
});
expect(firstApprovalPicker).toBeInTheDocument();
expect(screen.getByRole('button', { name: '결재 추가' })).toBeDisabled();
expect(screen.getByRole('button', { name: '합의 추가' })).toBeDisabled();
```

`user-select-editor.test.tsx`에 read-only 다중 선택의 칩은 삭제 affordance가 없고, 편집 가능한 칩은 기존 삭제 affordance와 동작을 유지하는 테스트를 추가한다.

```tsx
const chip = screen.getByText('홍길동').closest('.MuiChip-root');
expect(chip?.querySelector('.MuiChip-deleteIcon')).toBeNull();
```

- [x] **Step 2: Test multi-user approval and the next field**

첫 입력에서 `김민수`, `홍길동`을 선택하고 `결재 추가`를 누른 뒤 각각의 순서대로 확정 단계/읽기 전용 입력이 생기고 `결재선 3 사용자 선택`이 새 active input으로 나타나는지 검증한다. 두 확정 입력의 Autocomplete는 read-only여야 한다.

```tsx
expect(screen.getByRole('combobox', { name: '결재선 1' })).toHaveProperty(
  'readOnly',
  true,
);
expect(screen.getByRole('combobox', { name: '결재선 2' })).toHaveProperty(
  'readOnly',
  true,
);
expect(
  screen.getByRole('combobox', { name: '결재선 3 사용자 선택' }),
).toBeInTheDocument();
expect(screen.getByTestId('document-approval-stage-strip')).toHaveStyle({
  overflowX: 'auto',
});
```

- [x] **Step 3: Test agreement, candidate filtering, and stage removal**

새 모달에서 두 사람을 선택하고 `합의 추가`를 눌렀을 때 합의 1단계에 두 사용자가 함께 남고 활성 입력이 `결재선 2 사용자 선택`이 되는지 검증한다. 확정 사용자는 활성 후보에서 빠지고, 단계 삭제 시 순번이 갱신되고 사용자가 다시 후보에 나타나는지 검증한다.

```tsx
expect(screen.getByTestId('document-approval-stage')).toHaveTextContent(
  '합의 1',
);
expect(
  screen.getByRole('combobox', { name: '결재선 2 사용자 선택' }),
).toBeInTheDocument();
fireEvent.click(screen.getByRole('button', { name: '합의 단계 1 삭제' }));
expect(
  screen.getByRole('combobox', { name: '결재선 1 사용자 선택' }),
).toBeInTheDocument();
```

- [x] **Step 4: Run the document composer tests and confirm failures**

Run: `cd frontend; npm run test -- tests/document-write-page.test.tsx tests/user-select-editor.test.tsx`

Expected: FAIL because the current UI exposes one shared approval selector and does not render numbered committed fields plus a trailing active selector.

## Task 2: Render ordered committed selectors and active selector

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx`
- Modify: `frontend/src/shared/components/f1-grid/editing/UserSelectEditor.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`
- Test: `frontend/tests/user-select-editor.test.tsx`

- [x] **Step 1: Render each committed stage as a read-only selector**

`UserSelectEditor`의 `renderValue`에서 `readOnly`이면 `<Chip>`의 `onDelete`를 생략하고, 편집 가능 입력은 기존 삭제 callback을 유지한다. `approvalStages.map((stage, index) => ...)`에서 사용자는 전체 `userOptions` 중 `stage.users`에 해당하는 value 칩으로 표시한다. 확정 입력의 `UserSelectEditor`는 `multiple`, `readOnly`, `preserveSelectionOrder`를 사용하고 `options={userOptions}`를 넘겨 선택 칩을 계속 표시한다. 각 단계에는 `결재선 ${index + 1}` 접근성 라벨, `결재 n`/`합의 n` 역할 문구, 기존 `SealSlot`, 삭제 버튼을 유지한다.

```tsx
<UserSelectEditor
  value={stage.users.map((user) => String(user.value))}
  options={userOptions}
  multiple
  preserveSelectionOrder
  readOnly
  label={`결재선 ${index + 1}`}
  onChange={() => undefined}
/>
```

**Step 1 test:** `user-select-editor.test.tsx`에서 `readOnly` 칩의 `.MuiChip-deleteIcon`이 없고, 기본 편집 가능 칩의 기존 삭제 동작은 유지되는지 검증한다.

- [x] **Step 2: Append one active multi-select and its role actions**

확정 단계 뒤에 `결재선 ${approvalStages.length + 1} 사용자 선택` 입력을 렌더링한다. `value={selectedApprovalUserIds}`, `options={approvalOptions}`, `multiple`, `hideSelectedOptions`, `preserveSelectionOrder`를 사용한다. `결재 추가`와 `합의 추가`는 이 마지막 입력값만 소비하고 선택값이 비었으면 disabled로 유지한다.

```tsx
<UserSelectEditor
  value={selectedApprovalUserIds}
  options={approvalOptions}
  multiple
  hideSelectedOptions
  preserveSelectionOrder
  label={`결재선 ${approvalStages.length + 1} 사용자 선택`}
  onChange={onApprovalUserChange}
/>
```

- [x] **Step 3: Keep the approval flow compact and locally scrollable**

확정 입력과 활성 입력을 같은 가로 스트립에서 순서대로 렌더링한다. 인접 단계의 기존 `>` 표시, 삭제 액션, 각 단계의 역할/순번을 보존한다. 스트립에는 `minWidth: 0`, `overflowX: 'auto'`, `overflowY: 'hidden'`을 두고 페이지 전체에는 고정 너비나 새 가로 스크롤을 만들지 않는다. 결재/합의 추가 버튼은 마지막 활성 입력에만 한 번 표시한다.

- [x] **Step 4: Preserve reference and composer behavior**

참조 입력은 기존 `multiple`, `hideSelectedOptions`, `preserveSelectionOrder`를 유지하고 `document-reference-list` 요약 DOM이 없는지 테스트한다. `useDocumentComposer`의 기존 add/remove/reset 동작과 `DocumentComposerDialog` 스크롤 규칙은 변경하지 않는다.

- [x] **Step 5: Run the focused regression suite**

Run: `cd frontend; npm run test -- tests/document-write-page.test.tsx tests/user-select-editor.test.tsx`

Expected: both files pass, including multi-approval order, agreement grouping, candidate exclusion/release, read-only committed fields, trailing active field, reference isolation, and modal editor scroll.

## Task 3: Validate responsive behavior and document results

**Files:**
- Update: `docs/spec/20261007/20261007_002_문서작성_결재선_입력필드_공간개선_사양서.md`
- Create: `docs/result/20261007/document-write-approval-selector-fields/20261007_002_문서작성_결재선_입력필드_공간개선_결과보고서.md`
- Create: `docs/result/20261007/document-write-approval-selector-fields/screenshots/approval-selector-375.png`
- Create: `docs/result/20261007/document-write-approval-selector-fields/screenshots/approval-selector-768.png`
- Create: `docs/result/20261007/document-write-approval-selector-fields/screenshots/approval-selector-1280.png`
- Create: `docs/result/20261007/document-write-approval-selector-fields/screenshots/approval-selector-body-scroll-375.png`

- [x] **Step 1: Run lint and production build**

Run:

```powershell
Set-Location frontend
npm run lint -- src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx src/pages/groupware/documents/write/hooks/useDocumentComposer.ts src/shared/components/f1-grid/editing/UserSelectEditor.tsx tests/document-write-page.test.tsx tests/user-select-editor.test.tsx
npm run build
```

Expected: Oxlint reports no errors; `tsc -b` and Vite production build exit successfully.

- [x] **Step 2: Inspect the browser at all required widths**

Start the frontend with `npm run dev`. Open the document composer and inspect 375px, 768px, and 1280px. At 375px confirm the stage strip itself scrolls horizontally, body/document width does not exceed viewport width, each role action aligns with the active selector, and the reference selector remains usable. Enter a long body and verify the modal content scrolls while its header/footer remain reachable. The live session exposed only one selectable user, so browser verification covered one committed approval stage and its trailing active input; multi-user and multi-stage behaviors were verified by the focused tests. The server started for this check was stopped.

- [x] **Step 3: Save screenshots and record measured results**

Save captures under `docs/result/20261007/document-write-approval-selector-fields/screenshots/`. Record test counts, lint/build outcomes, viewport widths, document/viewport widths, and modal/editor scroll measurements. Note any limitation if the live data does not provide multiple candidates; do not claim unperformed browser interactions.

- [x] **Step 4: Review final worktree**

Run `git diff --check`, inspect `git status --short`, and confirm no shared editor, API, route, backend, or database files changed. Do not commit unrelated existing modifications.
