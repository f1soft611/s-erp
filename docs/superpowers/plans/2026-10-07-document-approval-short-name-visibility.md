# Document Approval Short-Name Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display three- and four-character approval and agreement participant names without ellipses, while retaining truncation for longer names.

**Architecture:** Keep the approval grid responsive and wrap it without page-level horizontal overflow. Remove the obsolete delete-button column from the approval name row, set approval slots to a minimum width that can fit four Korean characters next to the sequence badge, and widen the agreement name cap to four ems. Test the participant layout styles and full accessible names in the existing document composer suite.

**Tech Stack:** React, TypeScript, MUI, Vitest, React Testing Library, Playwright.

---

## File map

- `docs/directions/20261007/20261007_011_문서작성_짧은이름_말줄임_개선_작업지시서.md` — approved requirements and scope.
- `docs/plan/20261007/20261007_011_문서작성_짧은이름_말줄임_개선_계획서.md` — dated task sequence and validation.
- `docs/spec/20261007/20261007_011_문서작성_짧은이름_말줄임_개선_사양서.md` — precise name widths, layout and truncation rules.
- `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx` — approval slot sizing and approval/agreement name row styles.
- `frontend/tests/document-write-page.test.tsx` — short-name width and longer-name truncation regression coverage.
- `docs/result/20261007/document-composer-approval-stage/20261007_007_문서작성_결재단계_중복방지_초기결재자_결과.md` — append implementation and responsive browser evidence.
- `docs/result/20261007/document-composer-approval-stage/screenshots/approval-stage-{375,768,1280}.png` — refresh the privacy-safe composer captures.

## Task 1: Write the dated direction, plan, and specification

**Files:** create the three dated documents above before changing source or tests.

- [ ] **Step 1: Write the direction.** State that all approval and agreement names of three or four characters must appear in full; longer names remain single-line ellipsized. Approval grid slots may be wider and fewer per row on narrow screens, but page-level horizontal overflow is not allowed. Keep scope to the frontend component, regression test, and result artifacts.
- [ ] **Step 2: Write the dated plan.** Record test-first implementation, exact Vitest/lint/build commands, browser checks at 375px/768px/1280px, and screenshot/result updates.
- [ ] **Step 3: Write the specification.** Specify 88px as the minimum approval slot width; the sequence badge remains 20px wide with a 2px gap; the moved X button is not reserved in the name row; approval names have no arbitrary `3em` cap and use available space with ellipsis only when longer than the cell; agreement names are limited to `4em`; full labels remain available through `title` and participant accessible labels.
- [ ] **Step 4: Review consistency.** Confirm all three dated documents agree with the approved design document and describe no backend or database changes.

## Task 2: Add name-width regression assertions

**File:** `frontend/tests/document-write-page.test.tsx`, test `renders compact accessible badges, seals, removal actions, and ellipsized names`.

- [ ] **Step 1: Change the test names to four Korean characters.** Set `approvalName` to `홍길동김` and `agreementName` to `김민수박`. Keep user IDs distinct and keep the existing full-name title/accessibility-label assertions.
- [ ] **Step 2: Assert the approval width contract.** Assert the approval participant has a minimum width of `88px`, its name has `overflow: hidden`, `textOverflow: ellipsis`, and `whiteSpace: nowrap`, and the approval name element does not have a `3em` maximum width.
- [ ] **Step 3: Assert the agreement width contract.** Assert the four-character agreement name uses `maxWidth: 4em` and keeps the existing single-line overflow styles and full accessible label.
- [ ] **Step 4: Run the focused test to establish RED.** From `frontend`, run:

```powershell
npx vitest run tests/document-write-page.test.tsx -t "renders compact accessible badges" --testTimeout=15000
```

Expected: the test fails because current approval cells reserve the stale delete column and both participant name widths still use `3em`.

## Task 3: Implement four-character name visibility

**File:** `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx`.

- [ ] **Step 1: Increase the shared approval slot minimum.** Change `MIN_APPROVAL_SLOT_WIDTH` from `80` to `88`, which updates the responsive slot-capacity calculation and grid track minimum together.
- [ ] **Step 2: Use the minimum width on approval participants.** Add `minWidth: MIN_APPROVAL_SLOT_WIDTH` to the non-empty approval participant card so occupied grid tracks meet the same width as empty slots.
- [ ] **Step 3: Remove the stale bottom-row action column.** Replace the conditional approval name-row template with `gridTemplateColumns: '20px minmax(0, 1fr)'` for both fixed and removable approval participants; the X remains in the position row.
- [ ] **Step 4: Let approval labels use the freed width.** Remove the approval name's `maxWidth: '3em'` rule. Retain `minWidth: 0`, `overflow: 'hidden'`, `textOverflow: 'ellipsis'`, and `whiteSpace: 'nowrap'`.
- [ ] **Step 5: Widen agreement labels.** Change the agreement name cap from `3em` to `4em`, retaining its current single-line overflow behavior and full `title`.
- [ ] **Step 6: Run the focused regression test.** Repeat the Task 2 Vitest command. Expected: the four-character approval and agreement names satisfy the updated width assertions and existing accessible-name behavior.

## Task 4: Validate responsive rendering and update results

**Files:** update the existing result report and three screenshot files listed in the file map.

- [ ] **Step 1: Run the document composer suite.** From `frontend`, run:

```powershell
npx vitest run tests/document-write-page.test.tsx --testTimeout=15000
```

Expected: all tests pass, including existing sequence, deletion, and participant accessibility coverage.

- [ ] **Step 2: Lint and build.** From `frontend`, run:

```powershell
npm run lint -- src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx tests/document-write-page.test.tsx
npm run build
```

Expected: lint reports no issues; TypeScript and Vite production build succeed.

- [ ] **Step 3: Check real browser layouts.** At 375px, 768px, and 1280px, inspect the composer. Confirm four-character names render without ellipses, longer names still truncate, sequence badges and X actions do not overlap, the responsive slot count wraps as needed, and `document.documentElement.scrollWidth === window.innerWidth`.
- [ ] **Step 4: Refresh privacy-safe screenshots.** Capture the composer at all three widths, blur participant names and any identifying inputs, and retain the approval names and agreement chips in view.
- [ ] **Step 5: Update the existing result report.** Record the stale reserved delete column and `3em` caps as the cause, the width/layout change, commands and results, responsive observations, and relative screenshot links.
- [ ] **Step 6: Verify final changes.** Run `git diff --check` and inspect `git status --short`; ensure only the dated documents, approval component, focused test, result report, and three screenshots are changed for this follow-up.

## Self-review

- The goal covers both participant types and longer-name truncation; Tasks 2–3 test and implement both.
- The approved trade-off of fewer narrow-screen slots is represented in the direction/specification and browser checks.
- The sequence badge, accessible full label, and X action location remain unchanged; no backend/API/DB work is included.
- All touched files and verification commands are named explicitly.
