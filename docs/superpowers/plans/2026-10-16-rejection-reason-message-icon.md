# Rejection Reason Message Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace always-visible rejection-comment text below an approval seal with a small message button that opens the selected rejection reason in a popover.

**Architecture:** Reuse `DocumentApprovalLine.actionComment` in the existing approval-line detail UI. Render an overlay `IconButton` only for rejected approval lines with nonblank reasons, keep the selected button and reason in local state, and show the text in an anchored MUI `Popover`. Preserve all API, status, card-layout, and non-rejection-comment behavior.

**Tech Stack:** React 19, TypeScript, MUI, Vitest, Testing Library, Vite.

---

## File Map

- `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`: rejection-specific icon, popover state and rendering, and inline comment exclusion for `REJECTED`.
- `frontend/tests/document-write-page.test.tsx`: regression tests for conditional visibility, popover content, closing, and non-rejected comment preservation.
- `docs/directions/20261016/20261016_007_전자결재_반려사유_메시지아이콘_작업지시서.md`: approved task scope and acceptance conditions.
- `docs/plan/20261016/20261016_007_전자결재_반려사유_메시지아이콘_계획서.md`: dated execution plan.
- `docs/spec/20261016/20261016_007_전자결재_반려사유_메시지아이콘_상세사양서.md`: detailed display and validation contract.
- `docs/result/20261016/rejection-reason-message-icon/`: verification report and viewport captures.

## Task 1: Add Failing Rejection-Reason Tests

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`

- [ ] Add a focused detail fixture with at least one `APPROVAL` line in `REJECTED` state and `actionComment: '결재 내용을 확인해 주세요'`.
- [ ] Add another rejected line with an empty reason and a `RETURNED` line with an existing comment.
- [ ] Assert that only the rejected line with a nonblank reason exposes a message button named `결재자 반려 사유 보기`.
- [ ] Assert the reason is absent before activating the button, appears after activation, and remains associated with that button's line.
- [ ] Assert Escape closes the popover and clicking outside closes it.
- [ ] Assert the empty-reason rejected line has no message button and the `RETURNED` comment remains inline.
- [ ] Verify Enter/Space keyboard activation in the real browser step; the repository does not include `@testing-library/user-event`.

Run from `frontend`:

```powershell
node .\node_modules\vitest\vitest.mjs run tests\document-write-page.test.tsx -t "rejection reason"
```

Expected before implementation: FAIL because there is no rejection message button or popover and the rejected reason is currently rendered inline.

## Task 2: Implement the Rejection Message Control

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`

- [ ] Import `Popover`, `IconButton`, and `MessageOutlinedIcon` from existing MUI packages.
- [ ] Add local state with this shape:

```tsx
const [rejectionReasonPopover, setRejectionReasonPopover] = useState<{
  anchorEl: HTMLElement;
  reason: string;
} | null>(null);
```

- [x] Make the existing approval seal area relatively positioned; keep the `Avatar` size, source, status text, and existing test id unchanged. Reuse the existing area rather than adding a wrapper.
- [x] Render an `IconButton` positioned at the seal area's top-right only when `line.participantType === 'APPROVAL'`, `line.actionStatus === 'REJECTED'`, and `line.actionComment?.trim()` is truthy.
- [ ] Set its accessible name to `${line.participantName} 반려 사유 보기`, and on click set `anchorEl` from `event.currentTarget` and `reason` from the original `line.actionComment`.
- [ ] Render a single `Popover` for the selected state. Use the selected button as `anchorEl`, the selected reason as text, and clear state on `onClose`. Constrain its paper width to the viewport and set the reason text to wrap (`whiteSpace: 'pre-wrap'`, `overflowWrap: 'anywhere'`).
- [ ] Preserve MUI's default Escape and backdrop/outside close behavior; do not add a second global keyboard listener.
- [ ] Change the existing inline-comment condition so comments render exactly as before for non-`REJECTED` lines and never render under rejected seals.
- [ ] Keep card dimensions, connector ordering, status labels, stamp image handling, and API/type contracts unchanged.

## Task 3: Run Focused Tests and Build

**Files:**
- Test: `frontend/tests/document-write-page.test.tsx`
- Modify only if a failing assertion identifies an implementation defect: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`

- [ ] Run the new focused rejection test.

```powershell
node .\node_modules\vitest\vitest.mjs run tests\document-write-page.test.tsx -t "rejection reason"
```

Expected: PASS for conditional icon display, reason content, Escape/outside close, and non-rejected comment preservation.

- [ ] Run the full document-write-page test file.

```powershell
npm run test -- tests/document-write-page.test.tsx
```

Expected: PASS, including existing approval-seal rendering, detail panel, comment, attachment, and action-dialog checks.

- [ ] Run the frontend production build.

```powershell
npm run build
```

Expected: TypeScript project build and Vite production build both succeed.

## Task 4: Verify Browser Layout and Record the Result

**Files:**
- Create: `docs/result/20261016/rejection-reason-message-icon/20261016_007_전자결재_반려사유_메시지아이콘_결과보고서.md`
- Create: `docs/result/20261016/rejection-reason-message-icon/screenshots/` with 375px, 768px, and 1280px captures

- [ ] Reuse the existing S-ERP browser session on port 4173 only after confirming it is the correct application. Do not silently switch ports.
- [ ] Open a privacy-safe rejected approval detail fixture. At 375px, 768px, and 1280px, verify the small icon remains aligned to the reject seal, the popover opens beside it, and long reasons wrap without horizontal viewport overflow.
- [ ] Tab to the message button and use Enter and Space to open the popover; use Escape to close it.
- [ ] Save screenshots without real user, tenant, document, or account data.
- [ ] Write the result report with the reproduction condition, prior inline behavior, implemented interaction, exact test/build results, viewport findings, and screenshot references.
- [ ] Run `git diff --check`. Keep the unrelated pre-existing working-tree edits out of this task.

## Execution Record

Tasks 1-4 were executed inline in the existing checkout with user approval. The new regression failed before implementation and passed afterward; the three focused approval-line tests and frontend build pass. Real Chromium checks at 375px, 768px, and 1280px pass for icon bounds, long-text wrapping, Enter/Space activation, and Escape/outside dismissal.

The complete test file remains failing: 22 failures before implementation, 23 afterward. The additional feed-comment failure passes when rerun alone. These existing/variable failures were recorded rather than changing unrelated behavior. No merge or PR was performed.

See the [result report](../../result/20261016/rejection-reason-message-icon/20261016_007_전자결재_반려사유_메시지아이콘_결과보고서.md) for commands, counts, and screenshots.
