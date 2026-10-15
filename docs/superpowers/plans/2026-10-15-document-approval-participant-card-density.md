# Document Approval Participant Card Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make agreement/reference cards fill available row space and reduce their height, while reducing participant-name font size consistently across approval, agreement, and reference cards.

**Architecture:** Keep the existing three detail-card renderers in `DocumentApprovalDetailFeed.tsx`; update only their participant-name typography and, for agreement/reference, card flex, compact geometry, and secondary text/status styles. Extend the existing document detail regression test to prove the style contract and preserve participant/dept/status content. Update the dated issue/spec and result docs for this follow-up.

**Tech Stack:** React, TypeScript, MUI, Vitest, Playwright/browser validation.

---

## Approved design

Follow [the approved participant card density design](../specs/2026-10-15-document-approval-participant-card-density-design.md). Agreement/reference cards use `flex: 1 1 240px`, retain minimum width `min(100%, 190px)`, maximum width 100%, wrap within their content row, and use a 56px outer height, `box-sizing: border-box`, 32px avatars, and 6px vertical padding. Participant names in approval/agreement/reference use 14px; agreement/reference department names also use 14px. Agreement status remains on the second line with 14px text and approximately 18px line height. Keep `부서없음` behavior and all card order/status actions unchanged.

## File map

- Create `docs/directions/20261015/20261015_014_전자결재_결재선_참여자_카드_밀도_조정_작업지시서.md`: record scope, approved measurements, and completion criteria.
- Create `docs/plan/20261015/20261015_014_전자결재_결재선_참여자_카드_밀도_조정_계획서.md`: dated implementation steps and validation.
- Create `docs/spec/20261015/20261015_014_전자결재_결재선_참여자_카드_밀도_조정_상세사양서.md`: exact typography/geometry and preserved behavior.
- Modify `frontend/tests/document-write-page.test.tsx`: extend the existing `renders read-only system events and keeps only the required detail separators` regression test to check name/body/status sizing and agreement/reference geometry.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`: change only the detail approval/agreement/reference participant card presentation.
- Create `docs/result/20261015/document-approval-participant-card-density/20261015_014_전자결재_결재선_참여자_카드_밀도_조정_결과.md`: capture test/build/lint/browser outcomes and visual limitations.
- Create `docs/result/20261015/document-approval-participant-card-density/screenshots/` only when safe browser captures can be taken.

## Task 1: Create dated execution documents

**Files:**
- Create: `docs/directions/20261015/20261015_014_전자결재_결재선_참여자_카드_밀도_조정_작업지시서.md`
- Create: `docs/plan/20261015/20261015_014_전자결재_결재선_참여자_카드_밀도_조정_계획서.md`
- Create: `docs/spec/20261015/20261015_014_전자결재_결재선_참여자_카드_밀도_조정_상세사양서.md`

- [ ] **Step 1: Record exact scope in work direction and detailed specification**

Document the approved flex/height/avatar/padding/font-size values and explicitly preserve approval card width/height/avatar, department fallback, sequence, status, and participant order. Exclude composer cards, APIs, backend, and DB.

- [ ] **Step 2: Run whitespace check on new documents**

Run from repository root:

```powershell
git diff --check -- docs/directions/20261015/20261015_014_전자결재_결재선_참여자_카드_밀도_조정_작업지시서.md docs/plan/20261015/20261015_014_전자결재_결재선_참여자_카드_밀도_조정_계획서.md docs/spec/20261015/20261015_014_전자결재_결재선_참여자_카드_밀도_조정_상세사양서.md
```

Expected: exit code 0.

## Task 2: Add regression assertions before changing UI

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`

- [ ] **Step 1: Assert compact and expanding agreement/reference geometry**

In the existing read-only detail test, replace the previous 66px / 36px assertions with checks for both agreement and reference cards:

```tsx
for (const card of participantCards) {
  expect(card).toHaveStyle({
    flex: '1 1 240px',
    minWidth: 'min(100%, 190px)',
    maxWidth: '100%',
    height: '56px',
    boxSizing: 'border-box',
    paddingTop: '6px',
    paddingBottom: '6px',
  });
}
expect(screen.getByTestId('approval-line-agreement-avatar-72'))
  .toHaveStyle({ width: '32px', height: '32px' });
expect(screen.getByTestId('approval-line-reference-avatar-73'))
  .toHaveStyle({ width: '32px', height: '32px' });
```

Keep the existing `flexWrap: 'wrap'` assertions for both participant collections.

- [ ] **Step 2: Assert user-name and secondary text typography**

Use the known card IDs already rendered by the test. The approval cards use `approval-line-participant-<id>`; the existing approval fixture contains IDs 71, 74, and 75, the agreement fixture contains 72 and 76, and the reference fixture contains 73 and 78. Query each card's participant-name Typography by its `title` attribute and assert `fontSize: 14px`. Assert agreement/reference department Typography and agreement status badge also use 14px, with agreement status `lineHeight: 18px`. Retain assertions for `부서없음`, status labels, sequence, participant ordering, and profile image fallback.

- [ ] **Step 3: Run the focused test and verify expected failure**

Run from `frontend`:

```powershell
.\node_modules\.bin\vitest.cmd run tests/document-write-page.test.tsx -t "read-only system events" --testTimeout 15000
```

Expected: FAIL on the existing `flex: 0 1 240px` and/or `66px` card style before implementation. The test itself must execute; a test environment/reference error is not an acceptable RED result.

## Task 3: Apply compact styles to detail cards

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`

- [ ] **Step 1: Update approval participant-name font only**

Locate the participant-name Typography in the approval-card renderer and set its `sx.fontSize` to `'0.875rem'` (14px). Do not change approval card flex sizing, outer height, avatar, sequence, or status icon layout.

- [ ] **Step 2: Set agreement/reference cards to expanding compact geometry**

For both agreement and reference participant card roots, set `flex: '1 1 240px'`, preserve existing minimum/maximum widths, set `height: 56`, retain `boxSizing: 'border-box'`, and use `px: 1, py: 0.75` (horizontal 8px, vertical 6px). Set both avatars to 32px square with `flexShrink: 0`. Keep the participant list flex-wrap and gap unchanged.

- [ ] **Step 3: Reduce participant names and secondary text**

Set participant-name Typography in approval/agreement/reference cards to `fontSize: '0.875rem'`. In agreement/reference cards, set department Typography to `fontSize: '0.875rem'` and `lineHeight: '18px'`. Set agreement status badge to `fontSize: '0.875rem'` and `lineHeight: '18px'`; retain existing border, colors, label, and second-row placement. Preserve department `부서없음` fallback.

- [ ] **Step 4: Rerun the focused test**

Run:

```powershell
.\node_modules\.bin\vitest.cmd run tests/document-write-page.test.tsx -t "read-only system events" --testTimeout 15000
```

Expected: 1 targeted test passes, 82 are skipped.

## Task 4: Validate rendered layout and record results

**Files:**
- Create: `docs/result/20261015/document-approval-participant-card-density/20261015_014_전자결재_결재선_참여자_카드_밀도_조정_결과.md`
- Create (only if safe): `docs/result/20261015/document-approval-participant-card-density/screenshots/`

- [ ] **Step 1: Run lint, build, Problems, and diff checks**

Run from `frontend`:

```powershell
.\node_modules\.bin\oxlint.cmd src\pages\groupware\documents\write\components\DocumentApprovalDetailFeed.tsx tests\document-write-page.test.tsx
npm run build
```

Then run `git diff --check` from repository root and check Problems for both modified TS/TSX files. Record existing warnings distinctly from errors.

- [ ] **Step 2: Verify browser geometry at 375px, 768px, and 1280px**

Reuse the already-open S-ERP page at `http://127.0.0.1:4173`; do not start or terminate a server that belongs to the user. At each width inspect that agreement/reference cards fill available row space, wrap in the content region, remain 56px high, retain 32px avatars, display both text rows and the agreement status without clipping, and do not cause document-level horizontal overflow. Also verify approval names render at 14px while approval-card geometry stays unchanged. Save screenshots only if the page is authenticated and no private user or document data appears. If a suitable agreement/reference test document is unavailable, record which visual checks could not be completed and rely only on regression tests for those states.

- [ ] **Step 3: Write the result report**

Record exact implementation files, targeted test command/output, build/lint/Problems/diff results, viewport measurements, screenshot paths or reasons unavailable, and existing warnings. Do not claim a browser state was verified if the corresponding card was not rendered.

## Existing behavior to preserve

- Approval card width, height, avatar, action status, seals, ordering, and sequence badge.
- Agreement stages/order, status labels/colors, department labels/fallback, and participant ordering.
- Reference participant ordering and department fallback.
- Existing outer agreement/reference detail-row geometry and content-column wrapping.
- Existing avatar image and initial-letter fallback.

## Worktree safety

- Preserve all unrelated user changes and screenshots already present in the worktree.
- Do not stage/commit unrelated paths. Only stage files in this plan if a commit is requested.
- This change has no DB/API/backend impact.
