# Document Approval Compact Capacity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fit a default row of compact approval slots to the document dialog, wrap only excess approvers, and hide the agreement row until it has participants.

**Architecture:** Keep approval stages and per-user removal in `useDocumentComposer`. In `DocumentApprovalFields`, measure the actual approval-grid width with `ResizeObserver` and recalculate on window resize, calculate first-row capacity using 80px slots and 4px gaps, and render at least that many cells. Preserve global participant numbering, but render the agreement row only when its flattened participant list is non-empty.

**Tech Stack:** React, TypeScript, MUI, ResizeObserver, Vitest, Testing Library, Vite.

---

## File map

- `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx` — measured slot capacity, approval placeholder/populated cells, compact sequence badges/names, conditional agreement row.
- `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx` — preserve participant-removal callback wiring.
- `frontend/src/pages/groupware/documents/write/hooks/useDocumentComposer.ts` — preserve per-user removal, candidate restoration, and global stage/user order.
- `frontend/tests/document-write-page.test.tsx` — regression tests for responsive slot count, wrapping, conditional agreement visibility, compact presentation, and existing removal/reference behavior.
- `docs/superpowers/specs/2026-10-07-document-approval-compact-capacity-design.md` — approved detailed design.
- `docs/superpowers/specs/2026-10-07-document-approval-display-layout-design.md` — mark the earlier display dimensions/visibility as superseded by the compact-capacity design.
- `docs/directions/20261007/20261007_006_문서작성_결재표_합의칩_배치_작업지시서.md` — latest approved display behavior and completion criteria.
- `docs/plan/20261007/20261007_006_문서작성_결재표_합의칩_배치_계획서.md` — latest task plan.
- `docs/spec/20261007/20261007_006_문서작성_결재표_합의칩_배치_사양서.md` — latest UI and behavior specification.
- `docs/result/20261007/document-approval-display-layout/20261007_006_문서작성_결재표_합의칩_배치_결과보고서.md` — actual validation results.
- `docs/result/20261007/document-approval-display-layout/screenshots/` — privacy-safe approval-field capture; viewport measurements are recorded in the result report.

## Task 1: Align dated requirements to the approved compact layout

**Files:**
- Modify: `docs/superpowers/specs/2026-10-07-document-approval-display-layout-design.md`
- Modify: `docs/directions/20261007/20261007_006_문서작성_결재표_합의칩_배치_작업지시서.md`
- Modify: `docs/plan/20261007/20261007_006_문서작성_결재표_합의칩_배치_계획서.md`
- Modify: `docs/spec/20261007/20261007_006_문서작성_결재표_합의칩_배치_사양서.md`

- [x] **Step 1: Mark the prior display design as superseded**

In `2026-10-07-document-approval-display-layout-design.md`, retain the ordering and removal decisions, but link its status to `2026-10-07-document-approval-compact-capacity-design.md` as the latest source for slot sizing and agreement-row visibility.

- [x] **Step 2: Update the dated direction**

Specify default empty approval slots filling the first row to the actual dialog width, 80px minimum slots, 4px gaps, excess approvals wrapping, blank cells without sequence badges, conditional agreement visibility, circular sequence badges, and three-character Korean name truncation with an ellipsis.

- [x] **Step 3: Update the dated plan and specification**

Make both documents describe the same row behavior, capacity formula, participant order/removal, privacy-safe responsive browser validation, and reference-row preservation. Link the new approved design document from both.

## Task 2: Add failing tests for capacity and conditional rows

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Assert the default row capacity from measured content width**

Export and import the pure `calculateApprovalSlotCapacity` helper, then add exact threshold assertions:

```tsx
import { calculateApprovalSlotCapacity } from '../src/pages/groupware/documents/write/components/DocumentApprovalFields';

expect(calculateApprovalSlotCapacity(262)).toBe(3);
expect(calculateApprovalSlotCapacity(654)).toBe(7);
expect(calculateApprovalSlotCapacity(940)).toBe(11);
expect(calculateApprovalSlotCapacity(0)).toBe(1);
```

Use this test-local observer mock in a rendered-composer test so the actual grid capacity and resize callback are exercised without relying on JSDOM layout:

```tsx
const approvalObservers: MockApprovalResizeObserver[] = [];

class MockApprovalResizeObserver implements ResizeObserver {
  private target: Element | null = null;

  constructor(private callback: ResizeObserverCallback) {
    approvalObservers.push(this);
  }

  observe(target: Element) {
    this.target = target;
    this.resize(262);
  }

  unobserve(_target: Element) {}

  disconnect() {
    this.target = null;
  }

  resize(width: number) {
    if (!this.target) return;
    const entry = {
      target: this.target,
      contentRect: {
        x: 0,
        y: 0,
        top: 0,
        right: width,
        bottom: 0,
        left: 0,
        width,
        height: 0,
        toJSON: () => ({}),
      },
    } as ResizeObserverEntry;
    this.callback([entry], this);
  }
}
```

Stub the global with `vi.stubGlobal('ResizeObserver', MockApprovalResizeObserver)`, render the dialog, and assert the grid's `data-slot-capacity` and slot count are `3`. Call `act(() => approvalObservers[0].resize(654))` and use `waitFor` to assert both become `7`. In `finally`, unmount the render and call `vi.unstubAllGlobals()` so later tests use the normal environment.

- [x] **Step 2: Assert placeholders and overflow behavior**

Verify empty default slots have a seal area but no sequence badge or remove button. With four committed approval participants and a three-slot measured capacity, assert all four remain in order, the grid has three columns, and the fourth cell occupies the next row. Verify no committed participant is replaced by a placeholder.

- [x] **Step 3: Assert badges, name truncation, and agreement visibility**

Verify committed approval and agreement users show the selected circular badge style, seal, individual delete control, and a name with a three-`em` maximum plus ellipsis styling while retaining the full name as its title/accessibility text. Assert the agreement row is absent with zero participants and appears after the approval row once an agreement participant is committed.

- [x] **Step 4: Keep existing regression cases**

Retain and adjust the existing tests for global sequence order, removing one agreement user, pruning its empty group, restoring candidates, and leaving reference selection independent. Run the focused suite before implementation and confirm the new requirements fail for missing capacity/conditional behavior rather than setup errors.

Run from `frontend`:

```powershell
npm run test -- tests/document-write-page.test.tsx tests/user-select-editor.test.tsx
```

## Task 3: Measure and render the responsive approval row

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx`

- [x] **Step 1: Add the capacity constants and pure calculation**

Use exact constants from the approved spec:

```tsx
const MIN_APPROVAL_SLOT_WIDTH = 80;
const APPROVAL_SLOT_GAP = 4;

export function calculateApprovalSlotCapacity(contentWidth: number): number {
  return Math.max(
    1,
    Math.floor(
      (contentWidth + APPROVAL_SLOT_GAP) /
        (MIN_APPROVAL_SLOT_WIDTH + APPROVAL_SLOT_GAP),
    ),
  );
}
```

- [x] **Step 2: Observe the actual grid width**

Keep the approval grid element in a ref, initialize capacity to one, and measure `clientWidth` when the element mounts. Observe it with `ResizeObserver`; calculate a new capacity from each entry's `contentRect.width`; disconnect the observer on cleanup. Also recalculate from `clientWidth` on window resize and remove the listener on cleanup. If `ResizeObserver` is unavailable, the window listener still updates capacity.

- [x] **Step 3: Generate enough approval cells for the default row and participants**

Create `Math.max(slotCapacity, approvalParticipants.length)` cells. Render the grid with exactly `slotCapacity` columns, `minmax(80px, 1fr)` tracks, and a 4px gap so participants beyond the first row wrap in sequence. Empty cells show a subdued seal area only. Committed cells retain `positionName`, seal, global sequence, participant name, and a delete action.

- [x] **Step 4: Apply compact participant styling**

Use a small soft-blue circular sequence badge. Constrain visible names to approximately `3em` with `overflow: hidden`, `text-overflow: ellipsis`, and `white-space: nowrap`; set the full name as a title and keep it in the accessible label. Keep the populated cell footer narrow enough for the 80px minimum track.

## Task 4: Hide empty agreement row and preserve participant behavior

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx`
- Verify: `frontend/src/pages/groupware/documents/write/hooks/useDocumentComposer.ts`
- Verify: `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx`

- [x] **Step 1: Render agreement only when it has users**

Conditionally render `document-agreement-display-row` when `agreementParticipants.length > 0`. Keep one compact gray chip per participant with the global circular badge, three-character ellipsized name, seal, and per-user removal action.

- [x] **Step 2: Preserve and verify global numbering/removal wiring**

Flatten stages in their existing order and assign one global sequence across approval and agreement entries. Keep the `onRemoveApprovalUser(stageId, userId)` wiring. Removing one agreement user must preserve other members; removing the last one must remove the agreement row; candidates and sequence labels must update immediately.

- [x] **Step 3: Run focused tests and lint**

Run the focused test command from Task 2 and:

```powershell
npm run lint -- src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx src/pages/groupware/documents/write/hooks/useDocumentComposer.ts tests/document-write-page.test.tsx
```

Expected: all approval-layout tests pass and lint reports no diagnostics in changed files. Record unrelated pre-existing failures separately rather than changing out-of-scope worktree edits.

## Task 5: Verify browser widths and report results

**Files:**
- Create: dated result report and screenshots listed in the file map.

- [x] **Step 1: Run the production build**

From `frontend`:

```powershell
npm run build
```

Expected: TypeScript project build and Vite production build succeed.

- [x] **Step 2: Inspect the actual dialog at 375px, 768px, and 1280px**

Use the document-write route and inspect the actual dialog-content widths, not only viewport breakpoints. Confirm empty slot counts follow the 80px/4px formula, populated approvals wrap only after the first-row capacity, the agreement row is hidden when empty, and the full document has no horizontal overflow.

- [x] **Step 3: Capture privacy-safe evidence**

Capture the approval and reference rows without participant names or document contents under `docs/result/20261007/document-approval-display-layout/screenshots/`. Record DOM measurements at 375px, 768px, and 1280px in the result report. The integrated browser renderer resets its viewport before saving screenshots, so retain only the accurately cropped stable 1102px capture rather than labeling a mismatched image as a required viewport.

- [x] **Step 4: Write observed results and inspect the final diff**

Record actual focused test, lint, build, capacity, resize, row visibility, overflow, and screenshot results in the dated result report. Run `git diff --check` and inspect only the task files; leave unrelated worktree changes untouched.
