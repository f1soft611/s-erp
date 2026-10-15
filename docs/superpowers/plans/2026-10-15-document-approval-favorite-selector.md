# Favorite Approval-Line Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 업무작성 결재선 설정에서 등록된 자주 쓰는 결재선을 select로 바로 임시 적용하고 저장 진입 버튼을 footer 왼쪽으로 옮긴다.

**Architecture:** `DocumentApprovalSettingsDialog`에서 기존 템플릿 요약/상세 API를 이용해 open 시 select 옵션을 채운다. 선택 성공은 현재 dialog draft만 갱신하며, 관리 Grid와 작성 화면 적용 경계는 보존한다. 기존 생성 버튼을 `CommonDialog.footerStart`에 연결하고 생성 결과를 목록에 반영한다.

**Tech Stack:** React, TypeScript, MUI, existing approval-line template service, CommonDialog, Vitest, React Testing Library, Vite

---

## Files and responsibilities

- `docs/directions/20261015/20261015_018_업무작성_자주쓰는결재선_선택모달_작업지시서.md`: 승인된 요구사항과 완료 조건
- `docs/plan/20261015/20261015_018_업무작성_자주쓰는결재선_선택모달_계획서.md`: 날짜별 프로젝트 계획과 검증 명령
- `docs/spec/20261015/20261015_018_업무작성_자주쓰는결재선_선택모달_상세사양서.md`: 선택, 오류, footer, 반응형 동작 계약
- `frontend/src/pages/groupware/documents/write/components/DocumentApprovalSettingsDialog.tsx`: selector 상태, summary loading, apply/failure handling, manager refresh, footer placement
- `frontend/tests/document-approval-settings-dialog.test.tsx`: selector lifecycle, draft boundary, footer positioning, post-create and refresh regressions
- `docs/result/20261015/document-approval-line-favorites/20261015_002_업무작성_자주쓰는결재선_결과보고서.md`: 후속 변경, 테스트/build 결과 및 responsive screenshots

`CommonDialog` already supports `footerStart`; no common dialog modification is planned. The template API/service, F1-Grid manager behavior, F1-Grid guide, backend, and database remain unchanged.

## Task 1: Add selector regression tests (TDD RED)

**Files:** Modify `frontend/tests/document-approval-settings-dialog.test.tsx`.

- [ ] **Step 1: Default the mocked summary request to an empty list**

Change the test setup so new open-time summary requests have a valid default response; individual tests can override it before rendering:

```tsx
beforeEach(() => {
  vi.resetAllMocks();
  templateApi.list.mockResolvedValue([]);
});
```

- [ ] **Step 2: Add an open-time list and immediate-apply test**

Mock a summary and its detail, render with `renderSettings()`, await the combobox and its option, then change the selected value. Assert the list request uses `001`, the detail request uses that template ID, and clicking the settings dialog's `적용` passes the mapped draft to `onApply` while keeping the fixed drafter.

```tsx
it('loads favorites on open and applies a selected template to the draft', async () => {
  templateApi.list.mockResolvedValue([
    { templateId: 9, name: '기본 결재선', eabusNo: '001' },
  ]);
  templateApi.get.mockResolvedValue({
    templateId: 9,
    name: '기본 결재선',
    eabusNo: '001',
    approvalLines: [
      {
        stageOrder: 2,
        participantOrder: 1,
        participantType: 'APPROVAL',
        participantUserId: 'approver-2',
      },
      {
        stageOrder: 3,
        participantOrder: 1,
        participantType: 'REFERENCE',
        participantUserId: 'reference-2',
      },
    ],
  });
  const { onApply } = renderSettings();
  const select = await screen.findByRole('combobox', {
    name: '자주 쓰는 결재선',
  });
  fireEvent.mouseDown(select);
  fireEvent.click(
    await screen.findByRole('option', { name: '기본 결재선' }),
  );

  expect(templateApi.list).toHaveBeenCalledWith('001');
  await waitFor(() => expect(templateApi.get).toHaveBeenCalledWith(9));
  expect(onApply).not.toHaveBeenCalled();
  fireEvent.click(
    within(screen.getByRole('dialog', { name: '결재선 설정' })).getByRole(
      'button',
      { name: '적용' },
    ),
  );

  expect(onApply).toHaveBeenCalledWith(
    expect.arrayContaining([
      expect.objectContaining({ isFixed: true }),
      expect.objectContaining({
        kind: 'approval',
        users: [expect.objectContaining({ value: 'approver-2' })],
      }),
    ]),
    ['reference-2'],
  );
});
```

- [ ] **Step 3: Run the new test and verify it fails for the missing selector**

Run from `frontend`:

```powershell
npx vitest run --testTimeout=15000 tests/document-approval-settings-dialog.test.tsx -t "loads favorites on open and applies a selected template to the draft"
```

Expected before implementation: FAIL because the approval settings dialog has no labeled favorite combobox.

- [ ] **Step 4: Add detail-failure preservation and list retry tests**

Use the existing `approvalStages` and `referenceUserIds` fixtures. Reject selected-template detail and assert the chosen option remains selected, an error appears, and applying the settings still returns the original stages/references:

```tsx
it('keeps the current draft when selected favorite loading fails', async () => {
  templateApi.list.mockResolvedValue([
    { templateId: 9, name: '기본 결재선', eabusNo: '001' },
  ]);
  templateApi.get.mockRejectedValue(new Error('상세 조회 실패'));
  const { onApply } = renderSettings();
  const select = await screen.findByRole('combobox', {
    name: '자주 쓰는 결재선',
  });
  fireEvent.mouseDown(select);
  fireEvent.click(
    await screen.findByRole('option', { name: '기본 결재선' }),
  );

  await waitFor(() => expect(templateApi.get).toHaveBeenCalledWith(9));
  expect(select).toHaveValue('9');
  expect(await screen.findByText('상세 조회 실패')).toBeInTheDocument();
  fireEvent.click(
    within(screen.getByRole('dialog', { name: '결재선 설정' })).getByRole(
      'button',
      { name: '적용' },
    ),
  );

  expect(onApply).toHaveBeenCalledWith(approvalStages, ['reference-1']);
});
```

Separately reject the initial list request, assert an explicit error and retry action, then resolve the next list request and assert the option appears:

```tsx
it('retries a failed favorite list request', async () => {
  templateApi.list
    .mockRejectedValueOnce(new Error('목록 조회 실패'))
    .mockResolvedValueOnce([
      { templateId: 9, name: '기본 결재선', eabusNo: '001' },
    ]);
  renderSettings();

  expect(await screen.findByText('목록 조회 실패')).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: '결재선 목록 다시 시도' }),
  );
  await waitFor(() => expect(templateApi.list).toHaveBeenCalledTimes(2));
  fireEvent.mouseDown(
    await screen.findByRole('combobox', { name: '자주 쓰는 결재선' }),
  );
  expect(
    await screen.findByRole('option', { name: '기본 결재선' }),
  ).toBeInTheDocument();
});
```

Also cover a successful empty response:

```tsx
it('shows the registration prompt when no favorites are registered', async () => {
  templateApi.list.mockResolvedValue([]);
  renderSettings();

  const select = await screen.findByRole('combobox', {
    name: '자주 쓰는 결재선',
  });
  expect(select).toHaveValue('');
  expect(
    within(select.parentElement ?? select).getByText(
      '등록된 자주 쓰는 결재선',
    ),
  ).toBeInTheDocument();
});
```

- [ ] **Step 5: Run the failure-path tests and verify their expected RED state**

```powershell
npx vitest run --testTimeout=15000 tests/document-approval-settings-dialog.test.tsx -t "keeps the current draft when selected favorite loading fails|retries a failed favorite list request"
```

Expected before implementation: FAIL because there is no inline selector/list retry lifecycle.

- [ ] **Step 6: Update the manager helper and add a manager-close refresh test**

Update `openTemplateManagerGrid` to click the new `설정` button. Assert it opens the existing F1-Grid manager; after closing, the summary list is requested again and a rename is reflected by ID while the selected ID and current draft remain unchanged. Add a second case that deletes the selected summary and verifies the select resets without discarding the already-applied draft.

```tsx
it('refreshes the selector after closing the manager', async () => {
  const beforeRename = {
    templateId: 9,
    name: '기본 결재선',
    eabusNo: '001',
  };
  const afterRename = { ...beforeRename, name: '변경된 이름' };
  templateApi.list
    .mockResolvedValueOnce([beforeRename])
    .mockResolvedValueOnce([beforeRename])
    .mockResolvedValueOnce([afterRename]);
  templateApi.get.mockResolvedValue({
    ...beforeRename,
    approvalLines: [
      {
        stageOrder: 2,
        participantOrder: 1,
        participantType: 'APPROVAL',
        participantUserId: 'approver-2',
      },
    ],
  });
  templateApi.rename.mockResolvedValue(afterRename);
  const { onApply } = renderSettings();
  const select = await screen.findByRole('combobox', {
    name: '자주 쓰는 결재선',
  });
  fireEvent.mouseDown(select);
  fireEvent.click(
    await screen.findByRole('option', { name: '기본 결재선' }),
  );
  await waitFor(() => expect(templateApi.get).toHaveBeenCalledWith(9));

  fireEvent.click(
    within(screen.getByRole('dialog', { name: '결재선 설정' })).getByRole(
      'button',
      { name: '설정' },
    ),
  );
  await screen.findByRole('grid', { name: '자주 쓰는 결재선 목록' });
  editTemplateName('기본 결재선', '변경된 이름');
  fireEvent.click(
    within(getTemplateManager()).getByRole('button', {
      name: '저장',
      exact: true,
    }),
  );
  await waitFor(() =>
    expect(templateApi.rename).toHaveBeenCalledWith(9, '변경된 이름'),
  );
  await waitFor(() =>
    expect(getTemplateManagerCloseButton()).toBeEnabled(),
  );
  fireEvent.click(getTemplateManagerCloseButton());

  await waitFor(() => expect(templateApi.list).toHaveBeenCalledTimes(3));
  expect(
    screen.getByRole('combobox', { name: '자주 쓰는 결재선' }),
  ).toHaveValue('9');
  fireEvent.click(
    within(screen.getByRole('dialog', { name: '결재선 설정' })).getByRole(
      'button',
      { name: '적용' },
    ),
  );
  expect(onApply).toHaveBeenCalledWith(
    expect.arrayContaining([
      expect.objectContaining({
        kind: 'approval',
        users: [expect.objectContaining({ value: 'approver-2' })],
      }),
    ]),
    [],
  );
});
```

- [ ] **Step 7: Add footer placement and post-create selection tests**

Assert the save-start button is the only `자주 쓰는 결재선 저장` button in the outer dialog and is contained by `common-dialog-footer-start`. Click it, save a name, and assert the returned summary is listed and selected. The mocked list responses must cover the initial load, the duplicate-name check, and the post-create refresh:

```tsx
it('places favorite save in the footer and selects the created favorite', async () => {
  const created = {
    templateId: 12,
    name: '새 결재선',
    eabusNo: '001',
  };
  templateApi.list
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([created]);
  templateApi.create.mockResolvedValue(created);
  renderSettings();

  const settingsDialog = screen.getByRole('dialog', { name: '결재선 설정' });
  const footer = within(settingsDialog).getByTestId(
    'common-dialog-footer-start',
  );
  const saveStart = within(footer).getByRole('button', {
    name: '자주 쓰는 결재선 저장',
  });
  expect(
    within(settingsDialog).getAllByRole('button', {
      name: '자주 쓰는 결재선 저장',
    }),
  ).toHaveLength(1);
  fireEvent.click(saveStart);

  const saveDialog = screen.getByRole('dialog', {
    name: '결재선 템플릿 저장',
  });
  fireEvent.change(
    within(saveDialog).getByRole('textbox', { name: '결재선 이름' }),
    { target: { value: '새 결재선' } },
  );
  fireEvent.click(
    within(saveDialog).getByRole('button', { name: '저장', exact: true }),
  );

  await waitFor(() =>
    expect(templateApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: '새 결재선', eabusNo: '001' }),
    ),
  );
  expect(
    await screen.findByRole('combobox', { name: '자주 쓰는 결재선' }),
  ).toHaveValue('12');
});
```

Add a second case where creation succeeds but summary refresh rejects; assert the new option is still present/selected and the UI says save succeeded but refresh failed.

- [ ] **Step 8: Run the manager/footer tests and confirm RED**

```powershell
npx vitest run --testTimeout=15000 tests/document-approval-settings-dialog.test.tsx -t "refreshes the selector after closing the manager|resets selection after deleting its favorite|places favorite save in the footer and selects the created favorite|keeps a created favorite selected when list refresh fails"
```

Expected before implementation: FAIL because the body still contains both buttons and no direct selector refresh behavior exists.

## Task 2: Implement selector list loading and selection

**Files:** Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalSettingsDialog.tsx`.

- [ ] **Step 1: Add selector state and list loading lifecycle**

Keep the existing manager `templates` list where it serves the F1-Grid. Add only the state needed for the selected summary ID and selector-list loading/error status, and load summaries when the settings dialog becomes open for its current `documentCode`. Do not change the template service or its API contract.

```tsx
const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
  null,
);
const [templateListLoading, setTemplateListLoading] = useState(false);
const [templateListError, setTemplateListError] = useState('');
```

Use one refresh function for the outer selector and manager summary list:

```tsx
const refreshTemplateList = useCallback(async () => {
  if (!documentCode) return;
  setTemplateListLoading(true);
  setTemplateListError('');
  try {
    const summaries = await listApprovalLineTemplates(documentCode);
    setTemplates(summaries);
    return summaries;
  } catch (error) {
    setTemplateListError(
      error instanceof Error
        ? error.message
        : '자주 쓰는 결재선 목록을 불러오지 못했습니다.',
    );
    return null;
  } finally {
    setTemplateListLoading(false);
  }
}, [documentCode]);

useEffect(() => {
  if (open) void refreshTemplateList();
}, [open, refreshTemplateList]);
```

Import `useCallback` from React for the stable refresh handler. Keep the list-loading error separate from `templateError`, and render both beside the selector while retaining the existing manager/save error displays.

- [ ] **Step 2: Add the selector options under the existing section title**

Render a labeled MUI select under `자주 쓰는 결재선`, with `등록된 자주 쓰는 결재선` as the empty option and each loaded summary's `templateId` as the value. Let the select flex into remaining width beside the `설정` button. Keep the existing disabled conditions for missing document/user data.

Import `MenuItem` from MUI. Use a `TextField` with `select`, `aria-label="자주 쓰는 결재선"`, and `slotProps={{ select: { displayEmpty: true } }}`, controlled by `selectedTemplateId ?? ''`. Add the `MenuItem` for `value=""` with text `등록된 자주 쓰는 결재선`, then map the existing `templates` state into template options. Render an inline retry action for `templateListError`; its handler calls `refreshTemplateList()`. Render `templateError` beside the selector so failures from the shared detail loader are visible in this flow.

- [ ] **Step 3: Reuse detail load validation on select change**

Route the selected ID through the existing `loadTemplate(templateId)` flow so document-code checks and `fromTemplateParticipants` validation remain shared. Set the selected value when the user chooses an option; do not clear it on detail failure. Only replace `draftStages` and `draftReferenceUserIds` after all checks pass. Clear the previous `templateError` when a new selection starts, disable the select while `favoriteOperation === 'load'`, and expose a loading status beside it.

```tsx
onChange={(event) => {
  const templateId = Number(event.target.value);
  if (!Number.isInteger(templateId)) return;
  setTemplateError('');
  setSelectedTemplateId(templateId);
  void loadTemplate(templateId);
}}
```

- [ ] **Step 4: Run selector success and failure tests**

```powershell
npx vitest run --testTimeout=15000 tests/document-approval-settings-dialog.test.tsx -t "loads favorites on open and applies a selected template to the draft|keeps the current draft when selected favorite loading fails|retries a failed favorite list request"
```

Expected: all new selector lifecycle tests PASS, with existing tests unaffected.

## Task 3: Integrate manager refresh and relocate save start button

**Files:** Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalSettingsDialog.tsx`.

- [ ] **Step 1: Refresh summaries after the existing manager closes**

On manager close, refresh the selector summary list. Preserve the currently applied draft. Keep the selected ID if it still exists (including a renamed summary); reset it to the placeholder only if the selected template was deleted. On refresh failure, show an explicit error/retry action instead of presenting an empty list.

Use the refresh result to reconcile selection by ID, and leave the prior options/draft intact on failure:

```tsx
const refreshed = await refreshTemplateList();
if (refreshed) {
  setSelectedTemplateId((currentId) =>
    currentId !== null &&
    refreshed.some((template) => template.templateId === currentId)
      ? currentId
      : null,
  );
}
```

- [ ] **Step 2: Move the save trigger to `CommonDialog.footerStart`**

Remove the `자주 쓰는 결재선 저장` trigger from the section body. Pass that same button in `footerStart` on the outer settings `CommonDialog`; leave its existing `취소` and `적용` actions in `actions`. Preserve the trigger's disabled condition and keep the existing create-name dialog separate.

```tsx
footerStart={
  <Button
    variant="outlined"
    disabled={favoritesDisabled}
    aria-label="자주 쓰는 결재선 저장"
    onClick={openSaveDialog}
  >
    자주 쓰는 결재선 저장
  </Button>
}
```

- [ ] **Step 3: Select the created favorite and distinguish refresh failure**

Use the `ApprovalLineTemplateSummary` returned by `createApprovalLineTemplate`. After creation, refresh summaries and select the created ID. If refresh fails after creation succeeded, still insert the validated returned summary into the options and report that save succeeded but the list refresh failed; do not report the creation itself as failed.

```tsx
const created = await createApprovalLineTemplate({
  eabusNo: documentCode,
  name,
  approvalLines: toTemplateParticipants(
    draftStages,
    draftReferenceUserIds,
  ),
});
const refreshed = await refreshTemplateList();
if (refreshed) {
  setTemplates(
    refreshed.some((item) => item.templateId === created.templateId)
      ? refreshed
      : [...refreshed, created],
  );
} else {
  setTemplates((current) => [
    ...current.filter((item) => item.templateId !== created.templateId),
    created,
  ]);
  setTemplateListError(
    '결재선 저장은 완료했지만 목록 갱신에 실패했습니다. 목록을 다시 시도해 주세요.',
  );
}
setSelectedTemplateId(created.templateId);
```

- [ ] **Step 4: Run manager, footer and creation tests**

```powershell
npx vitest run --testTimeout=15000 tests/document-approval-settings-dialog.test.tsx -t "refreshes the selector after closing the manager|resets selection after deleting its favorite|places favorite save in the footer and selects the created favorite|keeps a created favorite selected when list refresh fails"
```

Expected: manager refresh, footer placement, created-summary selection, and post-create refresh-failure tests PASS; the F1-Grid manager's inline rename/save/delete behavior remains unchanged.

## Task 4: Regression verification and result documentation

**Files:** Modify `frontend/tests/document-approval-settings-dialog.test.tsx`; update `docs/result/20261015/document-approval-line-favorites/20261015_002_업무작성_자주쓰는결재선_결과보고서.md`; add responsive screenshots beneath its existing `screenshots` folder.

- [ ] **Step 1: Run the complete approval settings and service tests**

```powershell
npx vitest run --testTimeout=15000 tests/document-approval-settings-dialog.test.tsx tests/approval-line-template-service.test.ts
```

Expected: both test files pass, including existing manager, partial failure, deletion, and unsaved-change regression coverage.

- [ ] **Step 2: Run TypeScript/Vite build**

```powershell
npm run build
```

Expected: TypeScript check and Vite build succeed. If a failure comes from unrelated concurrent changes, record the exact file and diagnostic; do not modify unrelated work.

- [ ] **Step 3: Inspect diagnostics and whitespace**

Use Problems for the touched component/test and run:

```powershell
git diff --check
```

Expected: no diagnostics in the touched component/test and no whitespace errors.

- [ ] **Step 4: Verify the browser layouts**

Use the existing S-ERP app on `http://127.0.0.1:4173` only after confirming it is the workspace app. Check the selector/footer layout at 375px, 768px, and 1280px; ensure the select does not overlap `설정`, the footer save button stays left of cancel/apply, and the page has no horizontal overflow. Use only synthetic template names in captures.

- [ ] **Step 5: Update the result report**

Record actual test/build/diagnostic/browser results, the selected-A layout, selector success/error behavior, and screenshot paths. Do not mark unrun browser widths as passed.

- [ ] **Step 6: Review only the feature-owned diff and preserve concurrent changes**

Check the changed paths and `git status --short`. Do not stage or revert unrelated staged, unstaged, or untracked changes.

## Coverage review

- Layout A and footer-left save: Task 3 Steps 2 and 4; browser step in Task 4.
- Open-time list query, loading and retry: Task 1 Steps 3-4 and Task 2.
- Empty-list prompt: Task 1 Step 4 and Task 2 Step 2.
- Immediate temporary apply and fixed-drafter boundary: Task 1 Step 1 and Task 2 Step 3.
- Detail failure preserves draft and selected option: Task 1 Steps 3-4 and Task 2 Step 3.
- Manager refresh, rename/delete selection reconciliation: Task 1 Step 5 and Task 3 Step 1.
- New save selected and post-save refresh failure: Task 1 Step 5 and Task 3 Step 3.
- Existing API/DB and manager contracts: all implementation tasks reuse current service and manager flow; no server files are in scope.
