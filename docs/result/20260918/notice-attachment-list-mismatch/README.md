# 20260918_003 공지사항 첨부파일 목록 조회 불일치 결과 문서

## 근거 문서

- 작업지시서: [20260918*003*공지첨부*목록조회*불일치\_작업지시서.md](../../../directions/20260918/20260918_003_공지첨부_목록조회_불일치_작업지시서.md)
- 계획서: [20260918*003*공지첨부*목록조회*불일치\_계획서.md](../../../plan/20260918/20260918_003_공지첨부_목록조회_불일치_계획서.md)
- 사양서: [20260918*003*공지첨부*목록조회*불일치\_사양서.md](../../../spec/20260918/20260918_003_공지첨부_목록조회_불일치_사양서.md)

## 증상

- 공지사항 첨부 업로드(`POST /api/v1/groupware/boards/notice/posts/{postId}/attachments`)는 200 성공.
- 이후 목록 조회(`GET /api/v1/groupware/boards/notice/posts?page=1&size=20&keyword=`)에서 해당 게시글의 `attachments`가 항상 `[]`, `attachmentCount`가 항상 `0`으로 응답됨.

## 원인 (MCP 읽기 전용 확인 근거)

- 업로드 경로(`NoticeBoardServiceImpl.uploadAttachment`)는 `CommonFileService.uploadFile(tenantId, "NOTICE", postId, ...)`을 호출해 `tb_common_file`에 저장한다(`20260916_003` 공통화 작업 결과).
- 목록/상세 조회 경로(`hydratePost()`)는 리팩터링에서 누락되어 여전히 레거시 `NoticeBoardDAO.selectNoticeAttachmentList`(`tb_board_file` 테이블)를 조회하고 있었다.
- `s-erp-postgresql-readonly` MCP로 postId=54 기준 확인:
  - `tb_common_file` (`owner_type='NOTICE' AND owner_id=54`): 1건 존재 (`role-management-export (1).xlsx`)
  - `tb_board_file` (`post_id=54`): 0건
  - 위 결과가 "업로드는 성공하지만 목록에 안 보인다"는 증상과 정확히 일치함을 확인했다.
- `deleteAttachment`, `downloadAttachment`, `deletePost`는 이미 `commonFileService.listFiles(tenantId, "NOTICE", postId)`를 사용 중이라 영향 없음(정상 동작 확인).

## 수정 내역

- `backend/src/main/java/egovframework/let/groupware/notice/service/impl/NoticeBoardServiceImpl.java`
  - `hydratePost()`가 `commonFileService.listFiles(tenantId, BOARD_TYPE_NOTICE, postId)`(`tb_common_file`) 결과를 사용하도록 변경.
  - `CommonFileVO` → `NoticeBoardFileVO` 매핑 헬퍼(`toNoticeBoardFile`)를 추가하고, 기존 `uploadAttachment()`의 중복 매핑 코드를 이 헬퍼로 통합.
  - `attachmentCount`를 매핑된 첨부파일 리스트 크기로 재계산하여(기존 `commentCount`와 동일 패턴) SQL의 레거시 `tb_board_file` 기준 서브쿼리 값을 덮어씀.
- `backend/src/test/java/egovframework/let/groupware/notice/service/impl/NoticeBoardServiceImplTest.java`
  - `listPostsHydratesAttachmentsCommentsAndPaginationMetadata`, `getPostHydratesAttachmentsForEachNoticeComment`가 `commonFileService.listFiles(tenantId, "NOTICE", postId)` 모킹을 사용하도록 갱신, `attachmentCount` 검증 추가.
- `NoticeBoardDAO`, `NoticeBoard_SQL_postgresql.xml`은 변경하지 않음(사양서 결정에 따라 범위 외 유지, `tb_board_file` 기반 메서드는 더 이상 호출되지 않는 상태로 남음).

## 후속 검토 항목 (이번 범위 제외, 기록만 남김)

- `NoticeBoardServiceImpl.createPost()`의 `payload.getAttachmentIds()` 루프가 `selectNoticeAttachmentById`를 호출만 하고 결과를 사용하지 않아 실제로 아무 동작도 하지 않는 것으로 보인다. 이 경로가 실제 프론트에서 사용되는지 별도 확인이 필요하다.
- 더 이상 사용되지 않는 `tb_board_file` 기반 DAO/매퍼 메서드 정리 여부는 별도 작업으로 판단 필요.

## 검증

```
cd backend
mvn -Dtest=NoticeBoardServiceImplTest test   # PASS: 6 tests, 0 failures, 0 errors
mvn test                                      # 102 tests, 1 failure(MinioStorageConfigTest), 0 errors, 2 skipped
```

- `MinioStorageConfigTest.minioDefaultsMatchProjectCredentials` 실패는 이번 작업 파일과 무관한 기존 미해결 상태(`git status`상 이미 수정 중이던 `MinioStorageConfig.java`, `application-dev/prod.properties` 등 `20260918_002` MinIO 작업 관련 파일)로, 이번 작업 범위(`NoticeBoardServiceImpl` 및 해당 테스트)와 관련이 없음을 `git status --porcelain`으로 확인했다.
- DB 스키마 변경 없음 (신규 SQL/Rollback 스크립트 작성 대상 아님).

## 체크리스트

- [x] 작업지시서 확인 및 승인
- [x] 계획서/사양서 작성 및 승인
- [x] TDD(RED-GREEN) 기반 구현
- [x] MCP 읽기 전용 확인 근거 기록
- [x] 대상 테스트 통과, 전체 회귀에서 무관한 기존 실패 확인 및 기록
- [x] 결과 문서 작성
