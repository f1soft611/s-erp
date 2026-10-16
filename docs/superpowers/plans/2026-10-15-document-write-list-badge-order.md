# Document Write List Badge Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show approval status before document kind only in the document-writing page's list view.

**Architecture:** Add an optional, typed badge order to the shared `ListView`, preserving category-before-status as its default. Set status-before-category only at the document-writing page call site. Keep badge rendering, styling, data, and interactions unchanged.

**Tech Stack:** React, TypeScript, MUI, Vitest, React Testing Library.

---

## Approved specification

Follow [the dated work instruction](../../directions/20261015/20261015_013_document_write_list_badge_order_work_instruction.md), [the detailed specification](../../spec/20261015/20261015_013_document_write_list_badge_order_spec.md), and [the approved design](../specs/2026-10-15-document-write-list-badge-order-design.md).

## File map

- Modify `frontend/src/shared/components/view-mode/ListView.tsx`: expose an optional typed badge-order prop; retain the current order by default.
- Modify `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`: set status-first ordering only for document rows.
- Modify `frontend/tests/common-view-mode.test.tsx`: assert the unchanged category-first default.
- Modify `frontend/tests/document-write-page.test.tsx`: assert status-first order in the rendered document list.
- Create `docs/directions/20261015/20261015_013_document_write_list_badge_order_work_instruction.md`, `docs/plan/20261015/20261015_013_document_write_list_badge_order_plan.md`, and `docs/spec/20261015/20261015_013_document_write_list_badge_order_spec.md`.
- Create `docs/result/20261015/document-write-list-badge-order/20261015_013_document_write_list_badge_order_result.md` and screenshots for the required viewports.

## Task 1: Establish list-order regression tests

**Files:**
- Modify: `frontend/tests/common-view-mode.test.tsx`
- Modify: `frontend/tests/document-write-page.test.tsx`

- [ ] In `renders an optional status beside the category label in list mode`, assert the existing shared default order:

```tsx
const documentRow = screen.getByRole('button', { name: /결재 문서/ });
const badgeLabels = Array.from(
  documentRow.querySelectorAll('.MuiChip-root'),
  (chip) => chip.textContent,
);
expect(badgeLabels).toEqual(['기안서', '결재진행중']);
```

- [ ] In `defaults to list mode and displays approval status and all document kinds`, assert the first document row uses status-before-kind:

```tsx
const documentRow = within(listRegion).getByRole('button', {
  name: /문서 A/,
});
const badgeLabels = Array.from(
  documentRow.querySelectorAll('.MuiChip-root'),
  (chip) => chip.textContent,
);
expect(badgeLabels).toEqual(['결재진행중', '기안']);
```

- [ ] Run focused tests before implementation:

```powershell
Set-Location frontend
npx vitest run tests/common-view-mode.test.tsx tests/document-write-page.test.tsx
```

Expected: the shared default-order assertion passes; the new document-write status-first assertion fails because the current `ListView` renders category first.

## Task 2: Implement opt-in status-first ordering

**Files:**
- Modify: `frontend/src/shared/components/view-mode/ListView.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`

- [ ] Add the exact typed property and default to `frontend/src/shared/components/view-mode/ListView.tsx`:

```tsx
type ListViewProps<T extends CommonViewItem> = {
  items: T[];
  onItemClick?: (item: T) => void;
  ariaLabel?: string;
  badgeOrder?: 'category-status' | 'status-category';
};
```

Destructure with `badgeOrder = 'category-status'`. Keep each current `Chip` element and its full props/styles unchanged. Render those two existing conditional chip nodes in this order:

```tsx
{badgeOrder === 'status-category' ? (
  <>
    {statusChip}
    {categoryChip}
  </>
) : (
  <>
    {categoryChip}
    {statusChip}
  </>
)}
```

Define `statusChip` and `categoryChip` from the existing conditional `Chip` JSX so absent labels still yield `null` and styles are not duplicated.

- [ ] Set the prop on only the document list in `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`:

```tsx
<ListView
  items={unpinnedViewItems}
  ariaLabel="리스트형 문서 목록"
  badgeOrder="status-category"
  onItemClick={(item) => openDetail(Number(item.id))}
/>
```

Do not change the community notice call site.
- [ ] Re-run:

```powershell
Set-Location frontend
npx vitest run tests/common-view-mode.test.tsx tests/document-write-page.test.tsx
```

Expected: both tests pass, confirming the opt-in order and unchanged shared default.

## Task 3: Validate and record results

**Files:**
- Verify: the two focused Vitest files and the modified TSX files.
- Create: `docs/result/20261015/document-write-list-badge-order/20261015_013_document_write_list_badge_order_result.md`
- Create: screenshots under `docs/result/20261015/document-write-list-badge-order/screenshots/`

- [ ] Run `npm run build` from `frontend`.
- [ ] Run Problems validation for `ListView.tsx`, `DocumentWritePage.tsx`, and both modified test files.
- [ ] Run `git diff --check`.
- [ ] Verify the document list in the browser at 375px, 768px, and 1280px; save screenshots under the result folder. If authentication or the shared browser prevents a viewport check, record the limitation and do not claim that check passed.
- [ ] Record the exact test/build results, rendered order, and screenshot paths in the dated result document.
