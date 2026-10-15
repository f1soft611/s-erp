# Document Approval Agreement/Reference Inline Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Place agreement and reference headings beside their participant lists in the approval detail and give both rows the same title width and baseline height.

**Architecture:** Keep the change within the existing read-only approval detail component and its page-level regression test. Use matching two-column grid rows for agreement and reference, preserving participant cards, agreement stage ordering, status, and wrapping behavior.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Vite.

---

## File map

| File | Responsibility |
|---|---|
| `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx` | Render the agreement and reference title/content rows with matching grid sizing. |
| `frontend/tests/document-write-page.test.tsx` | Verify heading/content adjacency and identical sizing while retaining existing detail behavior assertions. |
| `docs/spec/20261015/20261015_008_전자결재_상세_합의_참조_한줄배치_상세사양서.md` | Define desktop and narrow viewport layout behavior and regression criteria. |
| `docs/result/20261015/document-approval-agreement-reference-inline-layout/` | Store the result report and synthetic-data browser captures. |

## Task 1: Write the detailed display specification

**Files:**
- Create: `docs/spec/20261015/20261015_008_전자결재_상세_합의_참조_한줄배치_상세사양서.md`

- [x] **Step 1: Record the agreed desktop and narrow-screen layout**

Document the matching 64px title column and 72px minimum row height; keep participant content in the flexible second column; preserve current cards, data, status, sequence, and processing behavior; permit participant wrapping without page-level horizontal scrolling; list the focused test, full test file, build, and 375px/768px/1280px browser verification criteria.

## Task 2: Add failing approval detail layout assertions

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Assert agreement and reference use parallel one-row layouts**

In the existing `renders read-only system events and keeps only the required detail separators` test, after the agreement and reference content assertions, add:

```tsx
const agreementGroup = screen.getByTestId('approval-line-group-agreement');
const referenceGroup = screen.getByTestId('approval-line-group-reference');
const agreementContent = within(agreementGroup).getByTestId(
  'approval-line-agreement-content',
);
const referenceContent = within(referenceGroup).getByTestId(
  'approval-line-reference-participants',
);

expect(agreementGroup.children).toHaveLength(2);
expect(agreementGroup.children[0]).toHaveTextContent('합의');
expect(agreementGroup.children[1]).toBe(agreementContent);
expect(referenceGroup.children).toHaveLength(2);
expect(referenceGroup.children[0]).toHaveTextContent('참조');
expect(referenceGroup.children[1]).toBe(referenceContent);
for (const row of [agreementGroup, referenceGroup]) {
  expect(row).toHaveStyle({
    display: 'grid',
    gridTemplateColumns: '64px minmax(0, 1fr)',
    minHeight: '72px',
  });
}
```

- [x] **Step 2: Run the focused test and confirm it fails**

Run from `frontend`:

```powershell
npx vitest run tests/document-write-page.test.tsx -t "read-only system events" --testTimeout=15000
```

Expected: FAIL because the existing headings are stacked above their contents and the agreement content row test ID does not yet exist.

## Task 3: Implement the shared title/content row geometry

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [x] **Step 1: Convert the agreement group to a two-column row**

Set `data-testid="approval-line-group-agreement"` to a grid with matching fixed title width, flexible content width, centered alignment, and a shared minimum row height:

```tsx
<Box
  data-testid="approval-line-group-agreement"
  sx={{
    display: 'grid',
    gridTemplateColumns: '64px minmax(0, 1fr)',
    alignItems: 'center',
    gap: 1,
    minWidth: 0,
    minHeight: 72,
  }}
>
```

Keep the `합의` Typography as the first child. Add `data-testid="approval-line-agreement-content"` to the existing `Stack`, retain its stage order and `spacing={1}`, and give it `minWidth: 0` and `alignSelf: 'stretch'`. Do not change stage cards, participant ordering, or status rendering.

- [x] **Step 2: Convert the reference group to the same grid**

Set `data-testid="approval-line-group-reference"` to the same grid geometry and keep the `참조` Typography first. Keep the existing participant wrapping box as the second child, preserving its participant map and card styles. These two group containers must use the same column width and minimum height.

- [x] **Step 3: Run the focused test and confirm it passes**

Run:

```powershell
npx vitest run tests/document-write-page.test.tsx -t "read-only system events" --testTimeout=15000
```

Expected: the focused approval detail test passes, including the one-row DOM structure, equal grid sizing, and existing participant/status/image assertions.

- [ ] **Step 4: Run the complete document-write test file**

Run:

```powershell
npm run test -- tests/document-write-page.test.tsx
```

Expected: all tests in `document-write-page.test.tsx` pass.

This post-change full-file run was not performed per the user's direction to keep test execution limited to the relevant approval detail test. The pre-change baseline full-file run had 21 failures and 62 passes; record those separately rather than attributing them to this change.

## Task 4: Build and verify the responsive layout

**Files:**
- Create: `docs/result/20261015/document-approval-agreement-reference-inline-layout/20261015_008_전자결재_상세_합의_참조_한줄배치_결과.md`
- Capture: `docs/result/20261015/document-approval-agreement-reference-inline-layout/screenshots/`

- [x] **Step 1: Build the frontend**

Run from `frontend`:

```powershell
npm run build
```

Expected: TypeScript and Vite build exit successfully.

The initial build attempt reported an unrelated `TS2339` in `approvalLineTemplate.service.ts`; a later fresh build completed successfully without any changes to that service file. The Vite build emitted its existing large-chunk warning.

- [ ] **Step 2: Verify the rendered page at required viewport widths**

Use the shared S-ERP browser at `http://127.0.0.1:4173/groupware/doc/write`. At 375px, 768px, and 1280px, confirm each title remains beside its content, the participant list wraps within its content column, and the page does not acquire horizontal overflow. Use only synthetic participant names in screenshots and save them beneath the result `screenshots` directory.

Not performed per the user's direction to leave browser verification blocked; no viewport result or screenshot is claimed, even though a later build retry succeeded.

- [x] **Step 3: Record results and inspect the scoped diff**

Record the focused test, full test file, build, and viewport results in the result report. Run:

```powershell
git diff --check
```

Expected: no whitespace errors. Preserve unrelated existing worktree changes and do not stage or commit them.
