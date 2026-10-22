# 문서 고정 확인 및 액션 위치 개선 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**목표:** 모든 문서 고정/해제 요청은 공지사항과 같은 확인 후에만 처리하고, 리스트·피드·상세에서 요청한 위치에 액션을 표시한다.

**아키텍처:** `DocumentWritePage`가 현재 대기 중인 문서 액션과 확인창을 소유하며, 확인된 액션만 기존 훅의 `togglePin`을 호출한다. 공유 `ListView`에는 선택적 헤더 액션 슬롯을 추가하고, `DocumentApprovalToolbar`는 기존 `pinControl`을 더보기 옆에 렌더링한다. 상세 패널은 부모가 전달한 현재 pin 상태를 사용한다.

**기술 스택:** React, TypeScript, MUI, Vitest, Testing Library.

---

## 파일 범위

- 수정: `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`
  - 확인 대기 문서 상태, 문서별 확인 문구, 확인/취소 동작을 통합하고 리스트·피드·상세·고정 패널 액션을 같은 handler에 연결한다.
- 수정: `frontend/src/shared/components/view-mode/ListView.tsx`
  - 기존 `renderItemAction` 동작은 유지하고, 별도의 선택적 `renderItemHeaderAction`을 category Chip 옆에 제공한다.
- 수정: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalToolbar.tsx`
  - `pinControl`을 기존 순서에서 더보기 바로 앞에 렌더링한다.
- 수정: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
  - feed item 여부와 무관하게 부모가 제공하는 pin 상태와 callback으로 pin control을 활성화한다.
- 수정: `frontend/src/pages/groupware/documents/write/components/DocumentFeedItem.tsx`
  - feed card pin control은 즉시 mutation이 아니라 문서작성 페이지 확인 handler를 호출하게 유지한다.
- 생성/수정 테스트:
  - `frontend/tests/document-write-page.test.tsx`
  - `frontend/tests/document-approval-toolbar.test.tsx`
  - `frontend/tests/common-view-mode.test.tsx`
- 생성: `docs/directions/20261021/20261021_004_document_pin_confirmation_actions_work_instruction.md`
- 생성: `docs/spec/20261021/20261021_004_document_pin_confirmation_actions_상세사양서.md`
- 생성: `docs/result/20261021/document-pin-confirmation-actions/result.md`
- 승인된 설계: `docs/superpowers/specs/2026-10-21-document-pin-confirmation-actions-design.md`

## Task 1: 리스트 헤더 액션 슬롯

**파일:** `frontend/src/shared/components/view-mode/ListView.tsx`, `frontend/tests/common-view-mode.test.tsx`

- [x] **Step 1: failing test**

`common-view-mode.test.tsx`에서 ListView 행을 `categoryLabel="업무연락"` 및 `renderItemHeaderAction={() => <button>문서 고정</button>}`로 렌더링한다. 테스트는 고정/metadata 액션이 행 클릭 버튼의 형제이며, category Chip 뒤에 위치하고 클릭 시 행 선택을 발생시키지 않는지 확인한다.

```tsx
const onItemClick = vi.fn();
render(
  <ListView
    items={[{ id: 1, title: '문서 A', categoryLabel: '업무연락' }]}
    onItemClick={onItemClick}
    renderItemHeaderAction={() => <button type="button">문서 고정</button>}
    renderItemAction={() => <button type="button">기존 액션</button>}
  />,
);
const row = screen.getByTestId('list-item-row');
const category = screen.getByTestId('list-category-chip');
const pin = screen.getByRole('button', { name: '문서 고정' });
const metadataAction = screen.getByRole('button', { name: '기존 액션' });
expect(category.compareDocumentPosition(pin) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
expect(pin.parentElement?.closest('button')).toBeNull();
expect(metadataAction.parentElement?.closest('button')).toBeNull();
fireEvent.click(pin);
expect(onItemClick).not.toHaveBeenCalled();
```

- [x] **Step 2: Run test to verify failure**

Run: `cd frontend; npm run test -- tests/common-view-mode.test.tsx`
Expected: TypeScript/Vitest fails because `renderItemHeaderAction` is not a `ListView` prop.

- [x] **Step 3: Implement the optional header slot**

Add `renderItemHeaderAction?: (item: T) => ReactNode` to `ListViewProps`. Keep the row click target as a content button, and render header and metadata actions in sibling grid cells so interactive action buttons are not nested inside the row button. Align the header action directly beside `categoryChip`; keep metadata actions visually aligned with the author/date row.

- [x] **Step 4: Verify the test**

Run: `cd frontend; npm run test -- tests/common-view-mode.test.tsx`
Expected: all common view tests pass.

## Task 2: Toolbar pin action next to more

**파일:** `frontend/src/pages/groupware/documents/write/components/DocumentApprovalToolbar.tsx`, `frontend/tests/document-approval-toolbar.test.tsx`

- **승인된 순서:** 상태 → 문서구분 → 세로 구분선 → 고정 → 더보기.

- [x] **Step 1: failing test**

Add a toolbar test passing `pinControl={<button type="button">문서 고정</button>}` and `moreMenu={<button type="button">문서 더보기</button>}`. Assert that both controls render and the pin button is immediately before the more button in DOM order.

```tsx
render(
  <DocumentApprovalToolbar
    status={<span>상태</span>}
    pinControl={<button type="button">문서 고정</button>}
    moreMenu={<button type="button">문서 더보기</button>}
    documentKind={<span>기안</span>}
  />,
);
const toolbar = screen.getByTestId('document-approval-toolbar');
const pin = within(toolbar).getByRole('button', { name: '문서 고정' });
const more = within(toolbar).getByRole('button', { name: '문서 더보기' });
expect(pin.compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
```

- [x] **Step 2: Run test to verify failure**

Run: `cd frontend; npm run test -- tests/document-approval-toolbar.test.tsx`
Expected: fails because the toolbar currently accepts but does not render `pinControl`.

- [x] **Step 3: Render pin control beside more**

Destructure `pinControl` in `DocumentApprovalToolbar` and render it immediately before `moreMenu`, after the status, document-kind chip, and separator.

- [x] **Step 4: Verify the toolbar tests**

Run: `cd frontend; npm run test -- tests/document-approval-toolbar.test.tsx`
Expected: all toolbar tests pass.

## Task 3: Centralize confirmation and wire all document surfaces

**파일:** `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`, `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`, `frontend/src/pages/groupware/documents/write/components/DocumentFeedItem.tsx`, `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Add failing confirmation tests**

Extend page mocks to include pinned-list and pin/unpin service exports. Add integration cases for list pin, pinned-panel unpin, feed pin, and detail overlay pin. For each, assert the action-specific confirmation title and `취소`/`확인` buttons; clicking `취소` must leave both mutation mocks uncalled; clicking `확인` must call exactly the expected API once.

```tsx
fireEvent.click(screen.getByRole('button', { name: '상단 고정 문서 A' }));
expect(await screen.findByRole('dialog', { name: '상단 고정' })).toBeInTheDocument();
expect(screen.getByText('이 문서를 상단에 고정하시겠습니까?')).toBeInTheDocument();
fireEvent.click(screen.getByRole('button', { name: '취소' }));
expect(pinDocumentApproval).not.toHaveBeenCalled();

fireEvent.click(screen.getByRole('button', { name: '상단 고정 문서 A' }));
fireEvent.click(await screen.findByRole('button', { name: '확인' }));
await waitFor(() => expect(pinDocumentApproval).toHaveBeenCalledTimes(1));
```

- [x] **Step 2: Run the targeted test to verify failure**

Run: `cd frontend; npm run test -- tests/document-write-page.test.tsx`
Expected: fails because page controls currently call `togglePin` immediately and the pinned-panel/list/feed/detail controls do not share a confirmation dialog.

- [x] **Step 3: Add one page-owned pending action**

In `DocumentWritePage`, add a pending-action state with `{ electronicApprovalId, isPinned, title } | null`. Add `requestPinToggle(id, isPinned, title)` to set it. All pin IconButtons must call `event.stopPropagation()` before requesting confirmation so clicks do not open the containing document row/card. Add a confirm handler that snapshots and clears the pending action, invokes `togglePin(id, isPinned)`, and reports errors using the existing `showError` pattern. Render one `UnsavedChangesConfirmDialog` with:

```tsx
title={pendingPinAction?.isPinned ? '상단 고정 해제' : '상단 고정'}
description={
  pendingPinAction?.isPinned
    ? '이 문서의 상단 고정을 해제하시겠습니까?'
    : '이 문서를 상단에 고정하시겠습니까?'
}
cancelLabel="취소"
continueLabel="확인"
```

Route list-row pin, pinned-panel unpin, feed-item pin, and overlay pin callbacks through `requestPinToggle`. Pass `isPinned` for the overlay by checking `pinnedDocuments` for `detailDocumentId`. Do not call pin/unpin APIs from component click handlers.

- [x] **Step 4: Update ListView and detail wiring**

Pass the document pin control through `renderItemHeaderAction` and remove its existing metadata-row `renderItemAction`. In `DocumentApprovalDetailFeed`, add optional `isPinned` to shared props and derive the panel state from that prop when no `feedItem` is present. Enable the toolbar pin control when both `onTogglePin` and a valid document ID exist, not only for feed presentation. Keep feed state derived from `feedItem.isPinned`. `DocumentFeedItem` continues passing the parent handler; it must not execute the API itself.

- [x] **Step 5: Verify page tests**

Run: `cd frontend; npm run test -- tests/document-write-page.test.tsx tests/use-document-write-page-pins.test.tsx tests/common-view-mode.test.tsx tests/document-approval-toolbar.test.tsx`
Expected: all selected suites pass; cancel makes zero API calls and confirm makes one.

## Task 4: Build, browser verification, and result documentation

**파일:** `docs/result/20261021/document-pin-confirmation-actions/result.md` 및 지정 스크린샷

- [x] **Step 1: Run frontend build**

Run: `cd frontend; npm run build`
Expected: TypeScript and production build succeed.

- [x] **Step 2: Verify browser**

Reuse the existing S-ERP session at `http://127.0.0.1:4173` only after confirming it is the app. Check list, feed, and detail at 375px, 768px, and 1280px. Verify list pin beside 업무구분, feed/detail pin beside 더보기, and no mutation before confirmation. Save screenshots to `docs/result/20261021/document-pin-confirmation-actions/screenshots`.

- [x] **Step 3: Write result**

Record implementation scope, targeted test/build output, browser viewport outcomes, screenshot paths, and no API/DB schema changes in `result.md`.

- [x] **Step 4: Check final diff**

Run: `git diff --check` and inspect `git status --short`. Confirm only listed files changed and preserve unrelated worktree edits.

## Task 5: Preserve pin state in file-mode detail overlays

**파일:** `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts`, `frontend/tests/document-file-page.test.tsx`

- [x] **Step 1: Add a failing regression test**

파일형에서 고정 문서의 파일을 열었을 때 상세 오버레이의 고정 액션이 `상단 고정 해제`로 표시되고, 클릭 시 해제 확인창이 나타나는지 검증한다. 목록 API 호출은 현재 scope, 문서 종류, 문서 ID 필터를 전달해야 한다.

- [x] **Step 2: Verify the test fails**

Run: `cd frontend; npm run test -- tests/document-file-page.test.tsx`
Expected: currently fails because file mode does not load pinned documents and the overlay is told the document is unpinned.

- [x] **Step 3: Load pinned state in file mode**

파일 모드의 초기 조회에서 `listPinnedDocumentApprovals(scope, documentType, selectedDocumentId)`를 호출하고, 반환된 결과를 `pinnedDocuments` 상태로 매핑한다. 파일 목록/요약 데이터 조회와 기존 필터 동작은 유지한다.

- [x] **Step 4: Verify regression and related tests**

Run: `cd frontend; npm run test -- tests/document-file-page.test.tsx tests/document-write-page.test.tsx tests/use-document-write-page-pins.test.tsx`
Expected: 파일형 상세 고정 상태와 기존 고정 동작이 모두 통과한다.

- [x] **Step 5: Update result evidence**

`result.md`에 재현 원인, 변경 사항, 테스트 및 빌드 결과를 기록한다. UI 배치 변경이 아니므로 기존 반응형 스크린샷을 유지한다.
