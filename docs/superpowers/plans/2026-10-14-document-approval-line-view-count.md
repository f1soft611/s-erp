# Electronic Approval Detail Header and Approval Line Implementation Plan

> **For agentic workers:** Execute each task in order and keep the existing unrelated worktree changes untouched. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the original detail author row, match the approval-line reference layout, and return a real per-user approval document view count.

**Architecture:** Extend the existing authorized approval detail transaction with a unique per-tenant/document/login history row and an atomic counter update, then return the current counter in the existing detail response. Keep the frontend on that response value and update only the approval detail author row and read-only approval-line presentation.

**Tech Stack:** React, TypeScript, MUI, Vitest, Spring MVC, MyBatis, PostgreSQL, JUnit 5, Mockito, Maven.

---

## Required project documents

- Create: `docs/directions/20261014/20261014_001_전자결재_상세_결재선_조회수_작업지시서.md` (created; user-approved scope)
- Create: `docs/plan/20261014/20261014_001_전자결재_상세_결재선_조회수_계획서.md`
- Create: `docs/spec/20261014/20261014_001_전자결재_상세_결재선_조회수_상세사양서.md`
- Reference: `docs/superpowers/specs/2026-10-14-document-approval-line-view-count-design.md`

## Implementation files and responsibilities

- Modify `backend/src/main/java/egovframework/let/groupware/approval/domain/model/DocumentApprovalDetailVO.java`: expose integer `viewCount`.
- Modify `backend/src/main/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalDAO.java`: add tenant-scoped login lookup, conflict-safe view history insert, and guarded counter update methods.
- Modify `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java`: record one authorized first view inside a write transaction and re-read the detail count after every insert attempt.
- Modify `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml`: map the count and add the three SQL statements.
- Modify `backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImplTest.java`: test first/repeat/other-user/unauthorized behavior.
- Modify `backend/src/test/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalMapperTest.java`: test SQL registration, tenant filters, duplicate conflict semantics, and count mapping.
- Modify `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`: require `viewCount` on approval detail.
- Modify `frontend/src/pages/groupware/documents/write/services/documentApproval.service.ts`: reject absent, negative, or non-integer detail view counts.
- Modify `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`: restore the author row and implement the exact approval-line layout.
- Modify `frontend/tests/document-approval-service.test.ts`: verify detail response `viewCount` validation.
- Modify `frontend/tests/document-write-page.test.tsx`: cover actual view count and screenshot-level approval-line semantics; set `viewCount: 0` on detail fixtures not testing a nonzero count.
- Create matching database artifacts under `docs/database/20261014/` and `backend/DATABASE/20261014/`; update `docs/database/db-schema.md`.
- Create `docs/result/20261014/approval-line-view-count/` with result Markdown and privacy-safe 375/768/1280 screenshots.

### Task 1: Write the dated detailed contract

**Files:**
- Create: `docs/plan/20261014/20261014_001_전자결재_상세_결재선_조회수_계획서.md`
- Create: `docs/spec/20261014/20261014_001_전자결재_상세_결재선_조회수_상세사양서.md`

- [x] **Step 1: Approve the work order**

The work order records the user-selected first-view-only policy and the two reference screenshots. Do not change the accepted behavior during implementation.

- [x] **Step 2: Verify the detailed API and schema contract**

The approval detail endpoint remains `GET /api/v1/groupware/approvals/documents/{electronicApprovalId}`. The `item` adds required integer `viewCount >= 0`; preserve every existing response field and list behavior. The PostgreSQL MCP confirmed the approval main's unique `(tenant_id, electronic_approval_id)` key and the login account primary key.

- [x] **Step 3: Record the exact screen and database rules**

The dated work order, plan, and detailed specification record the approved author metadata, chevrons, centered footer, ellipsis, numbered agreement/reference rows, transaction sequence, and migration requirements.

### Task 2: Add the schema migration and focused backend tests

**Files:**
- Create matching `20261014_001_add_electronic_approval_view_count.sql` in `docs/database/20261014/` and `backend/DATABASE/20261014/`.
- Create matching `20261014_001_change_electronic_approval_view_count_schema.md` in both directories.
- Create matching `20261014_001_rollback.sql` in both directories.
- Modify: `docs/database/db-schema.md`
- Test: `backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImplTest.java`
- Test: `backend/src/test/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalMapperTest.java`

- [ ] **Step 1: Write the idempotent migration**

```sql
BEGIN;

ALTER TABLE public.tb_electronic_approval_main
    ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.tb_electronic_approval_main'::regclass
          AND conname = 'chk_electronic_approval_main_view_count'
    ) THEN
        ALTER TABLE public.tb_electronic_approval_main
            ADD CONSTRAINT chk_electronic_approval_main_view_count
            CHECK (view_count >= 0);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tb_electronic_approval_view_history (
    view_history_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.tb_tenant (tenant_id),
    electronic_approval_id BIGINT NOT NULL,
    login_id BIGINT NOT NULL REFERENCES public.tb_login_account (login_id),
    viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_electronic_approval_view_history_document
        FOREIGN KEY (tenant_id, electronic_approval_id)
        REFERENCES public.tb_electronic_approval_main (tenant_id, electronic_approval_id)
        ON DELETE CASCADE,
    CONSTRAINT uk_electronic_approval_view_history_tenant_document_login
        UNIQUE (tenant_id, electronic_approval_id, login_id)
);

CREATE INDEX IF NOT EXISTS ix_electronic_approval_view_history_document
    ON public.tb_electronic_approval_view_history (tenant_id, electronic_approval_id);

COMMIT;
```

- [ ] **Step 2: Write the matching rollback**

```sql
BEGIN;
DROP TABLE IF EXISTS public.tb_electronic_approval_view_history;
ALTER TABLE public.tb_electronic_approval_main
    DROP CONSTRAINT IF EXISTS chk_electronic_approval_main_view_count;
ALTER TABLE public.tb_electronic_approval_main
    DROP COLUMN IF EXISTS view_count;
COMMIT;
```

- [ ] **Step 3: Record change metadata and update the cumulative schema**

Keep each change-history file identical in both locations. Record date `2026-10-14`, both affected objects, tenant-scoped unique key, counter update behavior, impact, and rollback path. Add `view_count` to the existing approval-main entry and add the new history-table entry to `docs/database/db-schema.md`.

- [ ] **Step 4: Write failing service and mapper assertions**

Add service tests named `detailIncrementsViewCountForFirstAuthorizedView`, `detailDoesNotIncrementViewCountForRepeatedView`, `detailRecordsAnotherLoginAsSeparateViewer`, `detailDoesNotRecordViewWhenDocumentIsUnavailable`, and `detailFailsWhenAuthenticatedLoginCannotBeResolved`. The first test configures two detail reads with view counts `0` then `1`, a tenant-scoped login lookup returning `201L`, history insert returning `401L`, and counter update returning `1`; assert returned count `1` and one update. The repeat test returns history ID `null`; assert the second detail read's count and verify the counter update is never called. The unavailable-detail test returns `null` from the first authorized detail query and verifies login lookup/history insert/counter update are never called. The login-resolution test returns null from `selectLoginIdByLoginCode` and verifies no history insert/counter update. In `DocumentApprovalMapperTest`, extend the detail JSON serialization test to set `viewCount` to `2` and assert the JSON property is `viewCount: 2`. Mapper SQL tests assert the tenant-scoped key, `ON CONFLICT ... DO NOTHING`, `RETURNING view_history_id`, `view_count = view_count + 1`, and `deleted_yn = 'N'`.

- [ ] **Step 5: Run backend tests and confirm the new assertions fail**

Run from `backend`:

```powershell
mvn "-Dtest=DocumentApprovalServiceImplTest,DocumentApprovalMapperTest" test
```

Expected: compile/test failure because the DAO methods, mapped statements, detail count field, and view tests are not implemented. Do not proceed if the failure comes from unrelated test setup.

### Task 3: Implement the authorized per-user detail counter

**Files:**
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/domain/model/DocumentApprovalDetailVO.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalDAO.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java`
- Modify: `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml`
- Test: the two backend test files from Task 2.

- [ ] **Step 1: Add the detail value and DAO contracts**

```java
private Integer viewCount;

public Integer getViewCount() { return viewCount; }
public void setViewCount(Integer viewCount) { this.viewCount = viewCount; }
```

Add DAO methods with these typed results:

```java
Long selectLoginIdByLoginCode(Map<String, Object> params) throws Exception;
Long insertElectronicApprovalViewHistory(Map<String, Object> params) throws Exception;
int incrementElectronicApprovalViewCount(Map<String, Object> params) throws Exception;
```

- [ ] **Step 2: Add mapper result and SQL**

Map `viewCount` from `view_count` and select `m.view_count` from the same authorized detail row. Resolve active login ID by `(tenant_id, login_code)` with `use_at = 'Y'`. Insert history using the approved unique key and `ON CONFLICT DO NOTHING RETURNING view_history_id`. Increment only the same tenant/document when `deleted_yn = 'N'`.

```sql
INSERT INTO public.tb_electronic_approval_view_history
    (tenant_id, electronic_approval_id, login_id, viewed_at)
VALUES
    (#{tenantId}, #{electronicApprovalId}, #{loginId}, CURRENT_TIMESTAMP)
ON CONFLICT (tenant_id, electronic_approval_id, login_id) DO NOTHING
RETURNING view_history_id
```

- [ ] **Step 3: Change the detail service transaction**

After the existing authorized detail query succeeds, resolve `LoginVO.id` under `LoginVO.tenantId`, attempt history insertion, and increment only when the returned history ID is non-null. Throw an explicit service error if account resolution fails or a just-inserted history cannot update exactly one live document row. Always re-run `selectDocumentApprovalDetail(params)` after the insert attempt and use this fresh VO for the existing attachment/line/event hydration. Keep the route, access query, and response envelope unchanged.

- [ ] **Step 4: Run focused backend tests**

Run:

```powershell
mvn "-Dtest=DocumentApprovalServiceImplTest,DocumentApprovalMapperTest" test
```

Expected: PASS for first view, repeated view, another account, missing detail, login account failure, mapper parse, tenant filters, and duplicate-safe SQL.

### Task 4: Update the frontend response type and detail tests

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`
- Modify: `frontend/src/pages/groupware/documents/write/services/documentApproval.service.ts`
- Test: `frontend/tests/document-approval-service.test.ts`
- Test: `frontend/tests/document-write-page.test.tsx`

- [ ] **Step 1: Extend the detail fixtures and add failing assertions**

Add response validation tests in `document-approval-service.test.ts` for absent, negative, and fractional `viewCount`. In `document-write-page.test.tsx`, add required `viewCount: 7` to the target detail fixture and `viewCount: 0` to other mocked details. Assert the author meta contains `기안자 · 2026.10.13 · 조회 7`, and assert view count is not locally incremented a second time. Update expectations for separate agreement/reference rows and their stage numbers; test that no chip is rendered.

- [ ] **Step 2: Run the focused frontend test and confirm failure**

Run from `frontend`:

```powershell
npm run test -- tests/document-approval-service.test.ts tests/document-write-page.test.tsx
```

Expected: FAIL on the absent author metadata/view count and the old connector/chip layout, not on test data setup.

- [ ] **Step 3: Add the required detail field and response validation**

```ts
export type DocumentApprovalDetail = Omit<DocumentApprovalRecord, 'summary'> & {
  viewCount: number;
  summary?: string;
  isDrafter: boolean;
  draftingWorkCategoryId: number | null;
  contentsJson: string;
  contentsHtml: string;
  approvalLines: DocumentApprovalLine[];
  attachments: DocumentDraftAttachmentResponse[];
  systemEvents: DocumentApprovalSystemEvent[];
};
```

In `getDocumentApprovalDetail`, require `Number.isSafeInteger(item.viewCount)` and `item.viewCount >= 0`; on failure, throw the existing `전자결재 상세 응답을 확인할 수 없습니다.` contract error. Do not fall back to zero in the display path.

- [ ] **Step 4: Run focused frontend tests**

Run:

```powershell
npm run test -- tests/document-approval-service.test.ts tests/document-write-page.test.tsx
```

Expected: PASS with the server-provided `viewCount` used in the author metadata.

### Task 5: Implement the screenshot-matched read-only approval UI

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`

- [ ] **Step 1: Restore the original author row**

Restore the existing Avatar/name layout above the approval panel. Put this exact data shape below the name:

```tsx
<Typography data-testid="approval-author-meta" variant="caption" color="text.secondary">
  기안자 · {formatApprovalDate(detail.createdAt)} · 조회 {detail.viewCount}
</Typography>
```

Keep the existing menu, status badge, and pin presentation in their original author-row positions. The detail header must not be merged into the approval panel.

- [ ] **Step 2: Replace the connector with a chevron icon**

Import MUI `ChevronRight` with `import ChevronRightIcon from '@mui/icons-material/ChevronRight';` and render exactly one icon between consecutive approval cards:

```tsx
{index < approvalLineGroups.approval.length - 1 && (
  <ChevronRightIcon
    aria-hidden="true"
    data-testid="approval-line-connector"
    fontSize="small"
  />
)}
```

Remove the custom line/triangle pieces and keep card-flow-only horizontal overflow.

- [ ] **Step 3: Center and truncate the stage footer**

Make the third card row a centered flex group containing the stage marker and participant name. Give the marker a non-shrinking fixed width. Give the name `minWidth: 0`, `noWrap`, `overflow: hidden`, `textOverflow: ellipsis`, centered text, and `title={line.participantName}`:

```tsx
<Box
  data-testid={`approval-line-sequence-${line.electronicApprovalLineId}`}
  sx={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0.5,
    minWidth: 0,
    width: '100%',
    px: 0.25,
  }}
>
  <Box
    component="span"
    sx={{
      display: 'grid',
      placeItems: 'center',
      flex: '0 0 16px',
      height: 16,
      border: '1px solid',
      borderColor: 'text.secondary',
      borderRadius: '50%',
      fontSize: '0.6rem',
    }}
  >
    {line.stageOrder}
  </Box>
  <Typography
    title={line.participantName}
    noWrap
    sx={{ minWidth: 0, flex: '0 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}
  >
    {line.participantName}
  </Typography>
</Box>
```

- [ ] **Step 4: Render numbered agreement and reference rows**

Replace the two chip maps with separate labeled row boxes. For every item, show `line.stageOrder` in the same compact circular order marker and the participant's department/name. Preserve sort order and ellipsis; keep the internal divider only when at least one lower group exists:

```tsx
<Box data-testid="approval-line-group-agreement">
  <Typography variant="caption" color="text.secondary">합의</Typography>
  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
    {approvalLineGroups.agreement.map((line) => (
      <Stack key={line.electronicApprovalLineId} direction="row" spacing={0.5} sx={{ minWidth: 0 }}>
        <Box
          component="span"
          sx={{
            display: 'grid',
            placeItems: 'center',
            flex: '0 0 16px',
            height: 16,
            border: '1px solid',
            borderColor: 'text.secondary',
            borderRadius: '50%',
            fontSize: '0.6rem',
          }}
        >
          {line.stageOrder}
        </Box>
        <Typography
          title={line.participantName}
          noWrap
          sx={{ minWidth: 0, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {[line.participantDepartmentName, line.participantName].filter(Boolean).join(' ')}
        </Typography>
      </Stack>
    ))}
  </Stack>
</Box>
```

Create a parallel `approval-line-group-reference` row sourced from `approvalLineGroups.reference` and label it `참조`.

- [ ] **Step 5: Rerun the focused frontend test**

Run `npm run test -- tests/document-write-page.test.tsx` from `frontend`. Expected: PASS for author row, counter, approval card order, two chevrons for three approval cards, centered footer, long-name ellipsis, numbered agreement/reference, statuses, read-only behavior, and existing comments/attachments.

### Task 6: Validate, capture, and record the result

**Files:**
- Modify: `docs/plan/20261014/20261014_001_전자결재_상세_결재선_조회수_계획서.md`
- Create: `docs/result/20261014/approval-line-view-count/20261014_001_전자결재_상세_결재선_조회수_결과.md`
- Create: `docs/result/20261014/approval-line-view-count/screenshots/approval-line-375.png`
- Create: `docs/result/20261014/approval-line-view-count/screenshots/approval-line-768.png`
- Create: `docs/result/20261014/approval-line-view-count/screenshots/approval-line-1280.png`

- [ ] **Step 1: Run related frontend tests and build**

From `frontend`, run:

```powershell
npm run test -- tests/document-write-page.test.tsx tests/feed-components.test.tsx
npm run build
```

Expected: both commands pass.

- [ ] **Step 2: Run the focused and full backend suite**

From `backend`, run:

```powershell
mvn "-Dtest=DocumentApprovalServiceImplTest,DocumentApprovalMapperTest" test
mvn test
```

Expected: focused tests pass. Record any pre-existing unrelated full-suite failure without changing unrelated code.

- [ ] **Step 3: Verify the browser at all required widths**

Use the existing `http://127.0.0.1:4173` S-ERP session. Verify actual viewport width and document scroll width at 375, 768, and 1280 CSS pixels. Confirm the approval flow alone may scroll horizontally and the full page does not. Hide or redact names before saving captures.

- [ ] **Step 4: Write the result record**

Record exact test/build commands and results, DB MCP metadata checks, migration paths, UI behavior, browser dimensions, and any known limits. Update the dated project-plan checkboxes only after evidence exists.

## Self-review checklist

- Every approved screenshot behavior has a dedicated frontend assertion or browser check.
- Counter increment is after authorization, tenant-scoped, duplicate-safe, and returned from a fresh detail read.
- Migration and rollback names match in both schema directories; `db-schema.md` is updated.
- No unrelated notice/feed/API state behavior is modified.
