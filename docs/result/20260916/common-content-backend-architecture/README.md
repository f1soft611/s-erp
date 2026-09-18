# 공통 첨부/댓글 아키텍처 구현 결과

## 작업 목적

- 공지사항 첨부/댓글 로직을 공통 보관 구조로 정리한다.
- `owner_type + owner_id` 기반으로 notice, board, approval, feed 등 여러 도메인이 같은 공통 API를 재사용한다.
- 백엔드와 프론트엔드가 동일한 의미와 경로 구조를 공유하도록 정합성을 맞춘다.

## 구현 내용

### 백엔드

- 공통 파일 DAO와 공통 댓글 DAO 생성
- MyBatis XML 기반 필드 매핑 및 영속 조회/등록/수정/삭제 쿼리 구현
- 공통 파일/댓글 서비스 로직이 빈 객체 대신 DAO 기반 영속 경로를 사용하도록 보강
- 공통 테이블 SQL 스키마 추가 및 롤백 스크립트 작성

### 프론트엔드

- 공통 첨부/댓글 호출 함수 `commonContentApi.ts`를 유지하고, ownerType 값 체계를 `NOTICE | BOARD | APPROVAL`으로 정리
- 공통 계약이 backend와 동일한 요소(tenantId, ownerType, ownerId)를 사용하도록 정렬

## 문서 반영

- [../../database/db-schema.md](../../database/db-schema.md)
- [../../database/2026-09-16/20260916_001_create_common_attachment_schema.md](../../database/2026-09-16/20260916_001_create_common_attachment_schema.md)
- [../../database/2026-09-16/20260916_001_create_common_attachment_schema_rollback.sql](../../database/2026-09-16/20260916_001_create_common_attachment_schema_rollback.sql)

## 검증

```bash
cd backend
mvn "-Dtest=CommonCommentServiceTest,AttachmentApiControllerTest,CommentApiControllerTest,FeedApiControllerTest" test
```

검증 결과:

- Tests run: 8
- Failures: 0
- Errors: 0
- Skipped: 0
- BUILD SUCCESS
