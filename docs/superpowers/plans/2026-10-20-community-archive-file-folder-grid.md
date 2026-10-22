# Community Archive File/Folder Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 자료실 테이블(`tb_board_post`, `tb_common_file`)을 유지하면서 폴더/파일 브라우저형 자료실로 전환하고, `새 자료 등록` 즉시 업로드 흐름과 파일명/폴더 변경을 안정적으로 제공한다.

**Architecture:** 백엔드는 파일 중심 API(`GET/POST/PUT /archive/files`)를 추가하고, 파일/게시글/폴더 검증을 서비스 트랜잭션에 집중한다. 프론트는 기존 게시글 작성/상세 흐름을 제거하고 폴더+파일 혼합 그리드, 즉시 파일 선택 업로드, 별도 파일 편집 대화상자로 재구성한다. 데이터 정리 SQL은 soft-delete only로 날짜별 이력/롤백 파일을 쌍으로 관리한다.

**Tech Stack:** React + TypeScript + Vitest + F1-Grid, Spring Boot/eGovFrame + MyBatis + JUnit/Mockito, PostgreSQL(read-only MCP for metadata evidence), Maven

---

## File Structure Map

- Backend API/Service/DAO
  - Modify: `backend/src/main/java/egovframework/let/groupware/community/archive/controller/ArchiveBoardApiController.java`
  - Modify: `backend/src/main/java/egovframework/let/groupware/community/archive/service/ArchiveBoardService.java`
  - Modify: `backend/src/main/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImpl.java`
  - Modify: `backend/src/main/java/egovframework/let/groupware/community/archive/domain/repository/ArchiveBoardDAO.java`
  - Modify: `backend/src/main/resources/egovframework/mapper/let/groupware/community/archive/ArchiveBoard_SQL_postgresql.xml`
  - Create: `backend/src/main/java/egovframework/let/groupware/community/archive/domain/model/ArchiveBoardFileItemVO.java`
  - Create: `backend/src/main/java/egovframework/let/groupware/community/archive/domain/model/ArchiveBoardFileSearchVO.java`
  - Create: `backend/src/main/java/egovframework/let/groupware/community/archive/domain/model/ArchiveBoardFileUpdateRequestVO.java`
- Frontend archive page
  - Modify: `frontend/src/pages/groupware/community/archive/ArchiveBoardPage.tsx`
  - Create: `frontend/src/pages/groupware/community/archive/components/ArchiveFileGrid.tsx`
  - Create: `frontend/src/pages/groupware/community/archive/components/ArchiveFileEditDialog.tsx`
  - Modify: `frontend/src/pages/groupware/community/archive/hooks/useArchiveList.ts`
  - Modify: `frontend/src/pages/groupware/community/archive/hooks/useArchiveMutations.ts`
  - Modify: `frontend/src/pages/groupware/community/archive/hooks/useArchiveCategories.ts`
  - Modify: `frontend/src/pages/groupware/community/archive/services/archiveBoardService.ts`
  - Modify: `frontend/src/pages/groupware/community/archive/types/archive.types.ts`
  - Remove: `frontend/src/pages/groupware/community/archive/components/ArchiveComposerDialog.tsx`
  - Remove: `frontend/src/pages/groupware/community/archive/components/ArchivePostDetail.tsx`
- Common-code dialog reuse
  - Modify: `frontend/src/shared/components/common-code/CommonCodeItemHelpDialog.tsx`
  - Modify: `frontend/src/pages/co/master/common-code/services/commonCodeManagement.service.ts`
  - Modify: `frontend/src/pages/co/workflow/form/services/draftFormManagement.service.ts`
- Tests
  - Modify: `backend/src/test/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImplTest.java`
  - Modify: `backend/src/test/java/egovframework/let/groupware/community/archive/controller/ArchiveBoardApiControllerTest.java`
  - Modify: `backend/src/test/java/egovframework/let/groupware/community/archive/mapper/ArchiveBoardTenantScopeMapperTest.java`
  - Modify: `frontend/tests/archive-page.test.tsx`
  - Modify: `frontend/tests/archive-board-service.test.ts`
  - Modify: `frontend/tests/common-code-item-help-dialog.test.tsx`
  - Create: `frontend/tests/common-code-management.service.test.ts`
- DB scripts/docs/results
  - Create: `backend/DATABASE/20261020/20261020_006_archive_empty_posts_soft_delete.sql`
  - Create: `backend/DATABASE/20261020/20261020_006_archive_empty_posts_soft_delete_rollback.sql`
  - Create: `backend/DATABASE/20261020/20261020_006_archive_empty_posts_soft_delete_change.md`
  - Create: `docs/database/20261020/20261020_006_archive_empty_posts_soft_delete.sql`
  - Create: `docs/database/20261020/20261020_006_archive_empty_posts_soft_delete_rollback.sql`
  - Create: `docs/database/20261020/20261020_006_archive_empty_posts_soft_delete_change.md`
  - Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
  - Create: `docs/result/20261020/community-archive-file-folder-grid/result.md`

---

### Task 1: Backend file list contract (TDD first)

**Files:**
- Create: `backend/src/main/java/egovframework/let/groupware/community/archive/domain/model/ArchiveBoardFileItemVO.java`
- Create: `backend/src/main/java/egovframework/let/groupware/community/archive/domain/model/ArchiveBoardFileSearchVO.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/community/archive/service/ArchiveBoardService.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/community/archive/domain/repository/ArchiveBoardDAO.java`
- Modify: `backend/src/main/resources/egovframework/mapper/let/groupware/community/archive/ArchiveBoard_SQL_postgresql.xml`
- Modify: `backend/src/main/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImpl.java`
- Modify/Test: `backend/src/test/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImplTest.java`
- Modify/Test: `backend/src/test/java/egovframework/let/groupware/community/archive/controller/ArchiveBoardApiControllerTest.java`
- Modify/Test: `backend/src/test/java/egovframework/let/groupware/community/archive/mapper/ArchiveBoardTenantScopeMapperTest.java`

- [ ] **Step 1: Write failing tests for file list API and service**

```java
@Test
void listFilesUsesRootWhenFolderCodeMissing() throws Exception {
    ArchiveBoardFileSearchVO search = new ArchiveBoardFileSearchVO();
    search.setOffset(0);
    search.setLimit(20);
    when(dao.selectArchiveFileList(anyMap())).thenReturn(Collections.emptyList());
    when(dao.selectArchiveFileCount(anyMap())).thenReturn(0L);

    ListResult<ArchiveBoardFileItemVO> result = service.listFiles(search, user);

    assertThat(result.getResultCnt()).isEqualTo(0L);
    verify(dao).selectArchiveFileList(argThat(p -> p.containsKey("rootOnly") && Boolean.TRUE.equals(p.get("rootOnly"))));
}
```

- [ ] **Step 2: Run only archive backend tests (expect fail)**

Run: `cd backend && mvn -Dtest=ArchiveBoardServiceImplTest,ArchiveBoardApiControllerTest,ArchiveBoardTenantScopeMapperTest test`  
Expected: FAIL with missing `listFiles/selectArchiveFileList` symbols or route mismatch.

- [ ] **Step 3: Implement minimal file list models + DAO + mapper**

```java
@Getter @Setter
public class ArchiveBoardFileSearchVO {
    private Long tenantId;
    private Integer offset = 0;
    private Integer limit = 20;
    private String keyword;
    private String folderCode;
}
```

```xml
<select id="selectArchiveFileList" parameterType="map" resultMap="archiveFileItemMap">
  SELECT f.file_id, p.post_id, f.file_name, f.file_size, f.mime_type, f.created_at AS uploaded_at,
         p.writer_name, p.category_code
  FROM tb_common_file f
  JOIN tb_board_post p ON p.post_id = f.owner_id
  WHERE f.tenant_id = #{tenantId}
    AND p.tenant_id = #{tenantId}
    AND p.board_type_code = 'ARCHIVE'
    AND p.is_deleted = 'N'
    AND f.owner_type = 'ARCHIVE'
    AND f.file_usage_type = 'ATTACHMENT'
    AND f.deleted_yn = 'N'
  ...
</select>
```

- [ ] **Step 4: Re-run archive backend tests (expect pass for list cases)**

Run: `cd backend && mvn -Dtest=ArchiveBoardServiceImplTest,ArchiveBoardApiControllerTest,ArchiveBoardTenantScopeMapperTest test`  
Expected: List-related cases PASS, remaining not-yet-implemented cases may still FAIL.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/egovframework/let/groupware/community/archive/domain/model/ArchiveBoardFileItemVO.java \
        backend/src/main/java/egovframework/let/groupware/community/archive/domain/model/ArchiveBoardFileSearchVO.java \
        backend/src/main/java/egovframework/let/groupware/community/archive/service/ArchiveBoardService.java \
        backend/src/main/java/egovframework/let/groupware/community/archive/domain/repository/ArchiveBoardDAO.java \
        backend/src/main/resources/egovframework/mapper/let/groupware/community/archive/ArchiveBoard_SQL_postgresql.xml \
        backend/src/main/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImpl.java \
        backend/src/test/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImplTest.java \
        backend/src/test/java/egovframework/let/groupware/community/archive/controller/ArchiveBoardApiControllerTest.java \
        backend/src/test/java/egovframework/let/groupware/community/archive/mapper/ArchiveBoardTenantScopeMapperTest.java
git commit -m "feat: add archive file-row listing API"
```

---

### Task 2: Direct upload endpoint + retire post-only create path

**Files:**
- Create: `backend/src/main/java/egovframework/let/groupware/community/archive/domain/model/ArchiveBoardFileUpdateRequestVO.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/community/archive/controller/ArchiveBoardApiController.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/community/archive/service/ArchiveBoardService.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImpl.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/community/archive/domain/repository/ArchiveBoardDAO.java`
- Modify: `backend/src/main/resources/egovframework/mapper/let/groupware/community/archive/ArchiveBoard_SQL_postgresql.xml`
- Modify/Test: `backend/src/test/java/egovframework/let/groupware/community/archive/controller/ArchiveBoardApiControllerTest.java`
- Modify/Test: `backend/src/test/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImplTest.java`

- [ ] **Step 1: Write failing tests for `POST /archive/files` and removed post create route**

```java
@Test
void createPostRouteIsNotExposedAnymore() throws Exception {
    mockMvc.perform(post("/api/v1/groupware/boards/archive/posts").contentType(APPLICATION_JSON).content("{}"))
        .andExpect(status().is4xxClientError());
}

@Test
void uploadFileCreatesPostWithFileNameTitle() throws Exception {
    MockMultipartFile file = new MockMultipartFile("file", "manual.pdf", "application/pdf", "abc".getBytes());
    mockMvc.perform(multipart("/api/v1/groupware/boards/archive/files").file(file))
        .andExpect(status().isCreated());
}
```

- [ ] **Step 2: Run targeted backend tests (expect fail)**

Run: `cd backend && mvn -Dtest=ArchiveBoardApiControllerTest,ArchiveBoardServiceImplTest test`  
Expected: FAIL because `/archive/files` route is not implemented and old `/posts` route still active.

- [ ] **Step 3: Implement upload flow (title from file name, null folder allowed)**

```java
ArchiveBoardFileItemVO uploadFile(MultipartFile file, String folderCode, LoginVO user) throws Exception {
    String title = sanitizeTitleFromFileName(file.getOriginalFilename());
    Long postId = archiveBoardDAO.insertArchivePost(buildUploadPostParams(user, title, folderCode));
    try {
        CommonFileVO uploaded = commonFileService.uploadFile(user.getTenantId(), ARCHIVE, postId, file, user.getId());
        return archiveBoardDAO.selectArchiveFileItemById(fileItemParams(user, uploaded.getFileId(), postId));
    } catch (Exception ex) {
        archiveBoardDAO.softDeleteArchivePost(softDeleteParams(user, postId));
        throw ex;
    }
}
```

- [ ] **Step 4: Re-run targeted backend tests (expect pass)**

Run: `cd backend && mvn -Dtest=ArchiveBoardApiControllerTest,ArchiveBoardServiceImplTest test`  
Expected: PASS for upload validations (empty file / 200+ title / inactive folder / valid root-folder upload).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/egovframework/let/groupware/community/archive/controller/ArchiveBoardApiController.java \
        backend/src/main/java/egovframework/let/groupware/community/archive/service/ArchiveBoardService.java \
        backend/src/main/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImpl.java \
        backend/src/main/java/egovframework/let/groupware/community/archive/domain/repository/ArchiveBoardDAO.java \
        backend/src/main/resources/egovframework/mapper/let/groupware/community/archive/ArchiveBoard_SQL_postgresql.xml \
        backend/src/test/java/egovframework/let/groupware/community/archive/controller/ArchiveBoardApiControllerTest.java \
        backend/src/test/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImplTest.java
git commit -m "feat: support direct archive file uploads"
```

---

### Task 3: Rename/move API + legacy multi-attachment reparent + last-file delete handling

**Files:**
- Modify: `backend/src/main/java/egovframework/let/groupware/community/archive/controller/ArchiveBoardApiController.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/community/archive/service/ArchiveBoardService.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImpl.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/community/archive/domain/repository/ArchiveBoardDAO.java`
- Modify: `backend/src/main/resources/egovframework/mapper/let/groupware/community/archive/ArchiveBoard_SQL_postgresql.xml`
- Modify/Test: `backend/src/test/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImplTest.java`
- Modify/Test: `backend/src/test/java/egovframework/let/groupware/community/archive/mapper/ArchiveBoardTenantScopeMapperTest.java`

- [ ] **Step 1: Write failing tests for `PUT /archive/files/{boardFileId}` and delete-last-attachment post soft delete**

```java
@Test
void moveOneFileFromLegacyMultiAttachmentPostCreatesNewPostForOnlyThatFile() throws Exception {
    // given post has 2 active attachments
    // when moving one file to another folder
    // then moved file owner_id changes to new post, sibling file remains on original post
}

@Test
void deleteLastAttachmentSoftDeletesOwningPost() throws Exception {
    service.deleteAttachment(13L, 101L, user);
    verify(dao).softDeleteArchivePost(anyMap());
}
```

- [ ] **Step 2: Run targeted backend tests (expect fail)**

Run: `cd backend && mvn -Dtest=ArchiveBoardServiceImplTest,ArchiveBoardTenantScopeMapperTest test`  
Expected: FAIL with missing update/reparent SQL and post cleanup assertions.

- [ ] **Step 3: Implement rename/move and inactive folder mutation rejection**

```java
if (destinationFolderCode != null) {
    categoryValidator.validate(user.getTenantId(), ARCHIVE, destinationFolderCode); // active only
}
if (isLegacyMultiAttachment(ownerPostId, user)) {
    Long newPostId = archiveBoardDAO.insertArchivePost(buildUploadPostParams(user, newFileName, destinationFolderCode));
    archiveBoardDAO.reassignArchiveFileOwner(fileOwnerParams(user, boardFileId, ownerPostId, newPostId, newFileName));
} else {
    archiveBoardDAO.updateArchivePostCategory(updatePostCategoryParams(user, ownerPostId, destinationFolderCode, newFileName));
    archiveBoardDAO.updateArchiveFileName(updateFileNameParams(user, boardFileId, ownerPostId, newFileName));
}
```

- [ ] **Step 4: Re-run targeted backend tests (expect pass)**

Run: `cd backend && mvn -Dtest=ArchiveBoardServiceImplTest,ArchiveBoardTenantScopeMapperTest test`  
Expected: PASS for rename/move/reparent/inactive-folder and last-file soft-delete logic.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/egovframework/let/groupware/community/archive/controller/ArchiveBoardApiController.java \
        backend/src/main/java/egovframework/let/groupware/community/archive/service/ArchiveBoardService.java \
        backend/src/main/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImpl.java \
        backend/src/main/java/egovframework/let/groupware/community/archive/domain/repository/ArchiveBoardDAO.java \
        backend/src/main/resources/egovframework/mapper/let/groupware/community/archive/ArchiveBoard_SQL_postgresql.xml \
        backend/src/test/java/egovframework/let/groupware/community/archive/service/impl/ArchiveBoardServiceImplTest.java \
        backend/src/test/java/egovframework/let/groupware/community/archive/mapper/ArchiveBoardTenantScopeMapperTest.java
git commit -m "feat: add archive file rename and move operations"
```

---

### Task 4: Shared common-code item helpers + dialog label override compatibility

**Files:**
- Modify: `frontend/src/shared/components/common-code/CommonCodeItemHelpDialog.tsx`
- Modify: `frontend/src/pages/co/master/common-code/services/commonCodeManagement.service.ts`
- Modify: `frontend/src/pages/co/workflow/form/services/draftFormManagement.service.ts`
- Modify/Test: `frontend/tests/common-code-item-help-dialog.test.tsx`
- Create/Test: `frontend/tests/common-code-management.service.test.ts`

- [ ] **Step 1: Write failing tests for optional dialog title/aria label and shared item save helper**

```tsx
it('keeps default draft-form title when no override provided', () => {
  render(<CommonCodeItemHelpDialog open groupId="1" ... />);
  expect(screen.getByText('기안양식 분류 설정')).toBeInTheDocument();
});

it('uses custom title and aria label when provided', () => {
  render(<CommonCodeItemHelpDialog open groupId="1" dialogTitle="자료실 폴더 설정" gridAriaLabel="자료실 폴더 목록" ... />);
  expect(screen.getByText('자료실 폴더 설정')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run targeted frontend tests (expect fail)**

Run: `cd frontend && npm run test -- tests/common-code-item-help-dialog.test.tsx tests/common-code-management.service.test.ts`  
Expected: FAIL because props/helpers are not yet implemented.

- [ ] **Step 3: Implement helper extraction and backward-compatible dialog defaults**

```ts
export function createCommonCodeItem(groupId: string, payload: CommonCodeItemSavePayload) {
  return apiPost(`/api/v1/co/master/common-code/groups/${groupId}/items`, payload);
}
export function updateCommonCodeItem(groupId: string, itemId: string, payload: CommonCodeItemSavePayload) {
  return apiPut(`/api/v1/co/master/common-code/groups/${groupId}/items/${itemId}`, payload);
}
```

```tsx
type CommonCodeItemHelpDialogProps = {
  ...
  dialogTitle?: string;
  gridAriaLabel?: string;
};
const titleText = dialogTitle ?? '기안양식 분류 설정';
const ariaLabelText = gridAriaLabel ?? '기안양식 분류 목록';
```

- [ ] **Step 4: Re-run targeted frontend tests (expect pass)**

Run: `cd frontend && npm run test -- tests/common-code-item-help-dialog.test.tsx tests/common-code-management.service.test.ts`  
Expected: PASS and no regressions in draft-form use.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/components/common-code/CommonCodeItemHelpDialog.tsx \
        frontend/src/pages/co/master/common-code/services/commonCodeManagement.service.ts \
        frontend/src/pages/co/workflow/form/services/draftFormManagement.service.ts \
        frontend/tests/common-code-item-help-dialog.test.tsx \
        frontend/tests/common-code-management.service.test.ts
git commit -m "refactor: share common-code item save helpers safely"
```

---

### Task 5: Frontend archive file-browser conversion (grid + direct upload + edit dialog)

**Files:**
- Modify: `frontend/src/pages/groupware/community/archive/ArchiveBoardPage.tsx`
- Create: `frontend/src/pages/groupware/community/archive/components/ArchiveFileGrid.tsx`
- Create: `frontend/src/pages/groupware/community/archive/components/ArchiveFileEditDialog.tsx`
- Modify: `frontend/src/pages/groupware/community/archive/hooks/useArchiveList.ts`
- Modify: `frontend/src/pages/groupware/community/archive/hooks/useArchiveMutations.ts`
- Modify: `frontend/src/pages/groupware/community/archive/hooks/useArchiveCategories.ts`
- Modify: `frontend/src/pages/groupware/community/archive/services/archiveBoardService.ts`
- Modify: `frontend/src/pages/groupware/community/archive/types/archive.types.ts`
- Remove: `frontend/src/pages/groupware/community/archive/components/ArchiveComposerDialog.tsx`
- Remove: `frontend/src/pages/groupware/community/archive/components/ArchivePostDetail.tsx`
- Modify/Test: `frontend/tests/archive-page.test.tsx`
- Modify/Test: `frontend/tests/archive-board-service.test.ts`

- [ ] **Step 1: Write failing archive-page and service tests for folder/file rows and immediate upload**

```tsx
it('clicking 새 자료 등록 opens file chooser and uploads selected files without composer', async () => {
  renderArchivePage();
  await user.click(screen.getByRole('button', { name: '새 자료 등록' }));
  expect(mockFileInputClick).toHaveBeenCalled();
  await selectFiles(['A.pdf', 'B.pdf']);
  expect(uploadArchiveFile).toHaveBeenCalledTimes(2);
});
```

```ts
it('calls GET /archive/files with offset/limit and optional folderCode', async () => {
  await fetchArchiveFiles({ offset: 0, limit: 20, folderCode: 'GENERAL' });
  expect(apiGet).toHaveBeenCalledWith('/api/v1/groupware/boards/archive/files?offset=0&limit=20&folderCode=GENERAL');
});
```

- [ ] **Step 2: Run targeted frontend tests (expect fail)**

Run: `cd frontend && npm run test -- tests/archive-page.test.tsx tests/archive-board-service.test.ts`  
Expected: FAIL due to post-centric UI/service API and missing file-edit dialog flow.

- [ ] **Step 3: Implement file-centric page state and APIs**

```ts
export async function uploadArchiveFile(file: File, folderCode?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (folderCode) formData.append('folderCode', folderCode);
  const response = await apiPostFormData<{ item?: ArchiveFileRow }>('/api/v1/groupware/boards/archive/files', formData);
  if (!response.item) throw new Error('Archive upload response did not include an item.');
  return response.item;
}
```

```tsx
const handleCreateClick = () => fileInputRef.current?.click();
const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(event.target.files ?? []);
  for (const file of files) {
    await uploadSingleFile(file, currentFolderCode ?? undefined);
  }
  event.target.value = '';
};
```

- [ ] **Step 4: Re-run targeted frontend tests (expect pass)**

Run: `cd frontend && npm run test -- tests/archive-page.test.tsx tests/archive-board-service.test.ts`  
Expected: PASS for root/folder navigation, upload statuses, rename/move dialog trigger, and error/retry handling.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/groupware/community/archive/ArchiveBoardPage.tsx \
        frontend/src/pages/groupware/community/archive/components/ArchiveFileGrid.tsx \
        frontend/src/pages/groupware/community/archive/components/ArchiveFileEditDialog.tsx \
        frontend/src/pages/groupware/community/archive/hooks/useArchiveList.ts \
        frontend/src/pages/groupware/community/archive/hooks/useArchiveMutations.ts \
        frontend/src/pages/groupware/community/archive/hooks/useArchiveCategories.ts \
        frontend/src/pages/groupware/community/archive/services/archiveBoardService.ts \
        frontend/src/pages/groupware/community/archive/types/archive.types.ts \
        frontend/tests/archive-page.test.tsx \
        frontend/tests/archive-board-service.test.ts
git commit -m "feat: convert archive page to file and folder browser"
```

---

### Task 6: Data cleanup SQL + docs pair and rollback

**Files:**
- Create: `backend/DATABASE/20261020/20261020_006_archive_empty_posts_soft_delete.sql`
- Create: `backend/DATABASE/20261020/20261020_006_archive_empty_posts_soft_delete_rollback.sql`
- Create: `backend/DATABASE/20261020/20261020_006_archive_empty_posts_soft_delete_change.md`
- Create: `docs/database/20261020/20261020_006_archive_empty_posts_soft_delete.sql`
- Create: `docs/database/20261020/20261020_006_archive_empty_posts_soft_delete_rollback.sql`
- Create: `docs/database/20261020/20261020_006_archive_empty_posts_soft_delete_change.md`

- [ ] **Step 1: Write SQL scripts and change note with cleanup actor marker**

```sql
-- 20261020_006_archive_empty_posts_soft_delete.sql
UPDATE tb_board_post p
SET is_deleted = 'Y',
    updated_at = CURRENT_TIMESTAMP,
    last_modified_by = 'archive-cleanup-20261020-006',
    last_modified_by_name = 'archive-cleanup-20261020-006'
WHERE p.board_type_code = 'ARCHIVE'
  AND p.is_deleted = 'N'
  AND NOT EXISTS (
      SELECT 1
      FROM tb_common_file f
      WHERE f.tenant_id = p.tenant_id
        AND f.owner_type = 'ARCHIVE'
        AND f.owner_id = p.post_id
        AND f.file_usage_type = 'ATTACHMENT'
        AND f.deleted_yn = 'N'
  );
```

- [ ] **Step 2: Add rollback script constrained to cleanup actor marker**

```sql
-- 20261020_006_archive_empty_posts_soft_delete_rollback.sql
UPDATE tb_board_post p
SET is_deleted = 'N',
    updated_at = CURRENT_TIMESTAMP
WHERE p.board_type_code = 'ARCHIVE'
  AND p.is_deleted = 'Y'
  AND p.last_modified_by = 'archive-cleanup-20261020-006'
  AND p.last_modified_by_name = 'archive-cleanup-20261020-006'
  AND NOT EXISTS (
      SELECT 1 FROM tb_common_file f
      WHERE f.tenant_id = p.tenant_id
        AND f.owner_type = 'ARCHIVE'
        AND f.owner_id = p.post_id
        AND f.file_usage_type = 'ATTACHMENT'
        AND f.deleted_yn = 'N'
  );
```

- [ ] **Step 3: Verify both folders contain same files and content**

Run: `git diff --no-index backend/DATABASE/20261020/20261020_006_archive_empty_posts_soft_delete.sql docs/database/20261020/20261020_006_archive_empty_posts_soft_delete.sql`  
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add backend/DATABASE/20261020/20261020_006_archive_empty_posts_soft_delete.sql \
        backend/DATABASE/20261020/20261020_006_archive_empty_posts_soft_delete_rollback.sql \
        backend/DATABASE/20261020/20261020_006_archive_empty_posts_soft_delete_change.md \
        docs/database/20261020/20261020_006_archive_empty_posts_soft_delete.sql \
        docs/database/20261020/20261020_006_archive_empty_posts_soft_delete_rollback.sql \
        docs/database/20261020/20261020_006_archive_empty_posts_soft_delete_change.md
git commit -m "docs: add archive cleanup SQL and rollback history"
```

---

### Task 7: Final verification + F1-Grid docs + result evidence

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Create: `docs/result/20261020/community-archive-file-folder-grid/result.md`

- [ ] **Step 1: Run full targeted automated verification**

Run:

```bash
cd frontend
npm run test -- tests/archive-page.test.tsx tests/archive-board-service.test.ts tests/common-code-item-help-dialog.test.tsx tests/common-code-management.service.test.ts
npm run build
cd ../backend
mvn -Dtest=ArchiveBoardServiceImplTest,ArchiveBoardApiControllerTest,ArchiveBoardTenantScopeMapperTest test
cd ..
git diff --check
```

Expected: All commands succeed; `git diff --check` reports no whitespace errors.

- [ ] **Step 2: Browser responsive verification at 375/768/1280**

Run: `cd frontend && npm run dev -- --strictPort`  
Expected: server binds to `127.0.0.1:4173`, then verify:
- 루트/폴더 전환과 breadcrumb
- 업로드 중 파일별 상태
- 비활성 폴더 다운로드 전용
- 파일명/폴더 변경 대화상자
- 좁은 화면에서 가로 overflow가 페이지 전체로 확장되지 않음

- [ ] **Step 3: Update docs and result evidence**

```md
## 검증 요약
- Vitest: PASS (4 files)
- Maven tests: PASS (3 classes)
- Build: PASS
- Browser: 375/768/1280 PASS
- MCP 확인: list_tables + describe_table 완료, query_readonly 미사용
```

- [ ] **Step 4: Final commit**

```bash
git add frontend/src/pages/f1-grid-docs/F1-GRID.md \
        docs/result/20261020/community-archive-file-folder-grid/result.md
git commit -m "docs: finalize archive file-folder grid verification"
```

---

## Self-Review

### 1) Spec coverage check

- 파일별 목록, 루트/폴더 구분, 검색/정렬 제약 → Task 1, Task 5
- 즉시 파일 선택 업로드, 파일별 성공/실패, 제목 자동 생성 → Task 2, Task 5
- 이름 변경/폴더 이동/legacy reparent, inactive 폴더 read-only → Task 3, Task 5
- 마지막 첨부 삭제 시 게시글 soft-delete → Task 3
- 공통코드 다이얼로그 재사용 + 기본값 보존 → Task 4
- 날짜별 cleanup SQL + rollback + 쌍 폴더 기록 → Task 6
- F1-Grid 문서/결과문서/검증/반응형 체크 → Task 7

누락 없음.

### 2) Placeholder scan

- `TODO`, `TBD`, “적절히 처리” 같은 모호 문구 없음.
- 모든 Task에 구체 파일 경로, 테스트 명령, 기대 결과, 코드 조각 포함.

### 3) Type/contract consistency

- 백엔드 파일 DTO 명칭: `ArchiveBoardFileItemVO`, 검색 VO `ArchiveBoardFileSearchVO`, 수정 요청 `ArchiveBoardFileUpdateRequestVO`로 일관.
- API 경로: `/api/v1/groupware/boards/archive/files` 기반 GET/POST/PUT 일관.
- 프론트 서비스 함수도 file 중심(`fetchArchiveFiles`, `uploadArchiveFile`)으로 일관.

---

Plan complete and saved to `docs/superpowers/plans/2026-10-20-community-archive-file-folder-grid.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
