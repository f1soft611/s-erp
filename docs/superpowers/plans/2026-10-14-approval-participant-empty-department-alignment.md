# Approval Participant Empty Department Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vertically center the remaining agreement/reference card content when a participant has no department name, without changing populated cards.

**Architecture:** Keep the change in the existing approval detail feed and its page-level regression test. Treat null, empty, and whitespace-only department names as missing; when missing, omit the department row and vertically center the one-row content. Preserve approval status, profile fallback, and all existing populated-department rendering.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library.

---

## File map

| File | Responsibility |
|---|---|
| `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx` | Conditionally render agreement/reference card department rows and center the one-row content when absent. |
| `frontend/tests/document-write-page.test.tsx` | Regression coverage for absent department names on both participant types and unchanged populated rows. |
| `docs/result/20261014/approval-line-detail-refinement/20261014_003_전자결재_상세_결재선_이미지표시_결과.md` | Record the small UI follow-up and its verification. |

## Task 1: Add missing-department regression coverage

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`

- [ ] **Step 1: Add missing-department participants to the existing detail fixture**

In the existing fixture in `renders read-only system events and keeps only the required detail separators`, set agreement line `72` to `participantDepartmentName: null`, add agreement line `77` with `participantDepartmentName: ''`, and add reference line `78` with `participantDepartmentName: '   '`. Give each added line a unique ID, `stageOrder: 2`, matching `participantType`, a readable participant name, and a status/profile image matching that participant type. Keep agreement line `76` and reference line `73` populated so the existing department assertions continue to verify the normal two-row layout.

- [ ] **Step 2: Assert the expected conditional card structure**

For agreement cards `72` and `77`, select the existing participant test IDs and assert there is no empty department paragraph (`querySelector('p[title=""]') === null`). For reference card `78`, assert its whitespace department paragraph is absent (`querySelector('p[title="   "]') === null`). Assert the agreement name and existing status badge share the same parent row for both cards; assert reference card `78` still contains its avatar and name and retains `alignItems: center`. Preserve existing assertions proving populated departments render for agreement ID `76` and reference ID `73`.

- [ ] **Step 3: Run the focused test and confirm the expected failure**

Run from `frontend`:

```powershell
npx vitest run tests/document-write-page.test.tsx -t "read-only system events" --testTimeout=15000
```

Expected: the new missing-department assertions fail because the current UI renders blank department paragraphs and keeps the agreement name and status in separate rows.

## Task 2: Implement the conditional one-row card layout

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [ ] **Step 1: Define missing department consistently for each participant**

Inside each agreement and reference `.map((line) => ...)` callback, derive:

```tsx
const departmentName = line.participantDepartmentName?.trim() ?? '';
const hasDepartmentName = departmentName.length > 0;
```

Do not mutate `line.participantDepartmentName` or alter API data.

- [ ] **Step 2: Render agreement status beside the name only when the department is absent**

Keep the current Avatar and outer card structure. Derive a `statusBadge` JSX value from the existing status badge markup so it can be placed in either layout without duplicating its styles or label. Render the name and badge in one row when department is absent; otherwise keep the name row followed by department and badge:

```tsx
<Box
  sx={{
    display: 'flex',
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    flexDirection: hasDepartmentName ? 'column' : 'row',
    justifyContent: hasDepartmentName ? 'initial' : 'space-between',
  }}
>
  <Typography variant="body1" title={line.participantName} noWrap sx={{ minWidth: 0 }}>
    {line.participantName}
  </Typography>
  {hasDepartmentName ? (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, mt: 0.25 }}>
      <Typography variant="body1" title={departmentName} color="text.secondary" noWrap sx={{ minWidth: 0, flex: 1 }}>
        {departmentName}
      </Typography>
      {statusBadge}
    </Box>
  ) : statusBadge}
</Box>
```

Keep the card's current minimum height and accessible labels. The card already uses `alignItems: 'center'`, which vertically centers this one-row content.

- [ ] **Step 3: Render reference name without the department row when absent**

Keep the existing content wrapper and name. Keep the existing two-row layout when `hasDepartmentName` is true. When false, omit only the department Typography:

```tsx
{hasDepartmentName ? (
  <Typography variant="body1" title={departmentName} noWrap color="text.secondary">
    {departmentName}
  </Typography>
) : null}
```

The existing `alignItems: 'center'` on the card vertically centers the remaining Avatar/name row. Keep existing card sizing, wrapping, Avatar fallback and name truncation.

- [ ] **Step 4: Run the focused test and confirm it passes**

Run:

```powershell
npx vitest run tests/document-write-page.test.tsx -t "read-only system events" --testTimeout=15000
```

Expected: the focused detail test passes, including missing- and populated-department cases.

- [ ] **Step 5: Run the complete document-write test file**

Run:

```powershell
npx vitest run tests/document-write-page.test.tsx --testTimeout=15000
```

Expected: all tests in `document-write-page.test.tsx` pass.

## Task 3: Validate build, browser layout, and result documentation

**Files:**
- Modify: `docs/result/20261014/approval-line-detail-refinement/20261014_003_전자결재_상세_결재선_이미지표시_결과.md`

- [ ] **Step 1: Build the frontend**

Run from `frontend`:

```powershell
npm run build
```

Expected: TypeScript and Vite build exit successfully. Record any pre-existing chunk-size warning without expanding this task's scope.

- [ ] **Step 2: Verify empty-department alignment in the shared browser**

Use synthetic participant entries without department names. At 375px, 768px, and 1280px, confirm the agreement name/status row and reference name/avatar row are vertically centered in their cards; confirm participants with departments retain their two-row layout and no new page-level horizontal overflow is introduced.

- [ ] **Step 3: Update the result document**

Record the empty-department behavior, test/build results, and the browser widths checked. Do not include actual user data or profile/stamp images.

- [ ] **Step 4: Review the exact diff and whitespace**

Run:

```powershell
git diff --check
```

Expected: no whitespace errors and only the component, relevant regression test, and result document are changed for this follow-up. Preserve unrelated existing worktree changes.
