# 20261022_001 전자결재 문서작성·현황 백엔드 계층 분리 상세 사양서

## 1. 목적 및 범위

문서작성 화면과 문서현황 화면은 프론트엔드에서 페이지별 디렉터리와 API 서비스로 분리되어 있다. 백엔드의 전자결재 Controller와 Service 구현에 함께 모여 있는 책임을 분리하고, eGovFrame의 Controller → Service 인터페이스 → Service 구현 → DAO/Mapper 흐름으로 정리한다.

이 작업은 구조 변경이며 제품 동작 변경이 아니다. 기존 API 경로, HTTP method, 파라미터, 응답 구조, DB 스키마, tenant/사용자 조회 범위, 권한 및 트랜잭션 동작을 유지한다.

### 근거 문서

- 작업지시서: [전자결재 문서작성·현황 백엔드 계층 분리 작업지시서](../../directions/20261022/20261022_001_electronic_document_backend_separation_work_instruction.md)
- 계획서: [전자결재 문서작성·현황 백엔드 계층 분리 계획서](../../plan/20261022/20261022_001_electronic_document_backend_layer_separation_plan.md)
- 승인 설계: [Document Approval Backend Separation Design](../../superpowers/specs/2026-10-22-document-approval-backend-separation-design.md)
- 실행 계획: [Electronic Approval Backend Separation Implementation Plan](../../superpowers/plans/2026-10-22-document-approval-backend-separation.md)

## 2. 적용할 eGovFrame 계층

각 Controller는 HTTP 요청/응답 매핑 및 기존 `ResultVO` 생성에 한정한다. 서비스 인터페이스는 해당 업무의 입력과 결과를 정의하고, 구현체는 `EgovAbstractServiceImpl`을 상속하여 검증·업무 처리·트랜잭션을 담당한다. MyBatis 조회/변경은 기존 `DocumentApprovalDAO`와 `DocumentApproval_SQL_postgresql.xml`을 이용한다.

서비스 구현은 프로젝트의 constructor injection 스타일을 따른다. 변경 작업을 위한 DTO, URL, 테이블 또는 매퍼 쿼리를 새로 설계하지 않는다. 공통 접근 서비스는 tenant와 로그인 사용자 검증 및 문서/초안 소유 확인을 제공해 각 업무 서비스가 동일한 권한 규칙을 사용하도록 한다.

## 3. 책임 분리

### 3.1 문서작성

신규 Controller/Service:

- `DocumentApprovalWriteApiController`
- `DocumentApprovalWriteService`
- `DocumentApprovalWriteServiceImpl`

담당 업무:

- 초안 신규 저장과 기존 초안 수정
- 문서작성 목록과 피드 목록 및 페이지 응답
- 문서작성 고정 목록과 개인별 고정/해제
- 문서작성 요약
- 임시 본문 이미지 업로드와 삭제

기존 Service 메서드 `saveDraft`의 두 overload, `listDocuments`, `searchWriteDocuments`, `searchWriteFeedDocuments`, `listFeedDocuments`, `listPinnedDocuments`, `listPinnedFeedDocuments`, `pinDocument`, `unpinDocument`, `getSummary`, `uploadTemporaryEmbeddedImage`, `deleteTemporaryEmbeddedImage`를 기능에 맞게 이동한다. 본문 이미지 URL resolver와 초안 저장에 종속된 헬퍼도 작성 ServiceImpl에 둔다.

### 3.2 문서현황

신규 Controller/Service:

- `DocumentApprovalStatusApiController`
- `DocumentApprovalStatusService`
- `DocumentApprovalStatusServiceImpl`

담당 업무:

- 기존 `GET /api/v1/groupware/approvals/documents/search` 엔드포인트
- 검색조건, 날짜 범위, 허용 정렬 필드/방향 및 페이지 범위 검증
- 로그인 사용자와 tenant 범위에 제한된 현황 목록/전체 건수 조회

기존 `searchDocuments` 메서드와 상태 검색 전용 검증 헬퍼를 옮긴다. `DocumentApprovalListQueryVO`, `DocumentApprovalListPageVO`, 행 VO를 변경하지 않는다.

### 3.3 공유 문서 상세/상호작용

신규 Controller/Service:

- `DocumentApprovalInteractionApiController`
- `DocumentApprovalInteractionService`
- `DocumentApprovalInteractionServiceImpl`

담당 업무:

- 문서 상세 조회
- 결재 신청, 결재/신청 취소, 결재 액션 및 기존 문서 삭제
- 관련 문서 파일 목록
- 댓글 조회/작성/수정/삭제와 댓글 첨부
- 문서 첨부 목록/업로드/삭제/다운로드 및 저장된 본문 이미지 스트리밍

문서작성 및 문서현황 화면이 같은 상세 컴포넌트와 권한을 사용하므로 이 업무들은 공통 서비스에 둔다.

### 3.4 공통 접근 검증

신규 `DocumentApprovalAccessService` / `DocumentApprovalAccessServiceImpl`은 다음 기존 정책을 한 곳에서 보장한다.

- 로그인 사용자 존재 및 식별자 검증
- tenant 및 기안자/참여자 조회 파라미터 구성
- 초안 소유자 여부 검증
- 문서 접근 가능 여부 검증

현재 메서드의 예외 타입/상태 코드를 유지하고, 기존 SQL 기반 권한 확인을 다른 계층에서 중복 구현하지 않는다.

## 4. 기존 API 계약과 경로 배치

모든 Controller의 class-level 경로는 `/api/v1/groupware/approvals`로 유지한다. 아래 endpoint는 겹치지 않게 업무 Controller로 배치한다.

| 업무 | HTTP method와 경로 |
|---|---|
| 작성 | `POST /drafts`, `PUT /drafts/{electronicApprovalId}` |
| 작성 목록 | `GET /documents`, `GET /documents/pinned` |
| 개인 고정 | `PUT /documents/{electronicApprovalId}/pin`, `DELETE /documents/{electronicApprovalId}/pin` |
| 요약 | `GET /summary` |
| 임시 본문 이미지 | `POST /embedded-images/temp`, `DELETE /embedded-images/temp/{uploadToken}` |
| 현황 | `GET /documents/search` |
| 결재 흐름 | `POST /{electronicApprovalId}/submit`, `POST /{electronicApprovalId}/submission-cancellation`, `POST /{electronicApprovalId}/approval-cancellation`, `POST /{electronicApprovalId}/actions`, `DELETE /{electronicApprovalId}` |
| 파일 페이지 | `GET /files` |
| 상세 | `GET /documents/{electronicApprovalId}` |
| 댓글 | `GET/POST /{electronicApprovalId}/comments`, `PUT/DELETE /{electronicApprovalId}/comments/{commentId}` |
| 댓글 첨부 | `GET/POST /{electronicApprovalId}/comments/{commentId}/attachments`, `GET /{electronicApprovalId}/comments/{commentId}/attachments/{fileId}/download`, `DELETE /{electronicApprovalId}/comments/{commentId}/attachments/{fileId}` |
| 문서 첨부 | `GET/POST /{electronicApprovalId}/attachments`, `DELETE /{electronicApprovalId}/attachments/{fileId}`, `GET /{electronicApprovalId}/attachments/{fileId}/download` |
| 저장된 본문 이미지 | `GET /{electronicApprovalId}/embedded-images/{fileId}` |

`GET /documents`는 문서작성의 목록 계약이며 `GET /documents/search`는 현황 계약이다. 두 경로를 병합하거나 프론트엔드 호출을 바꾸지 않는다.

## 5. 요청/응답과 데이터 흐름

1. Controller가 기존 경로의 query/request VO 및 `@AuthenticationPrincipal LoginVO`를 받는다.
2. Controller는 요청을 담당 서비스 인터페이스로 전달한다.
3. Service는 공통 접근 서비스를 사용해 로그인 사용자, tenant, 기안자/결재 참여자 범위를 확인한다.
4. Service가 기존 DAO 메서드와 파라미터 키로 조회/변경한다.
5. Controller가 현재 `ResultVoHelper`를 통해 같은 `ResultVO` 필드와 HTTP 상태를 반환한다.

문서작성 `GET /documents`는 현재 응답 구조를 유지한다. 기본 목록/피드 호출에는 `resultList`만 반환하고, offset/limit 기반 페이지 요청은 기존 `resultList`와 `totalRowCount`를 유지한다. `includeDetails` 처리 또한 기존 응답 동작을 보존한다.

문서현황 `GET /documents/search`는 현재 `resultList`와 `totalRowCount`를 반환한다. 검색 조건이 유효하지 않으면 기존과 동일한 400 오류 계약을 유지한다. 사용자 입력을 SQL 식별자에 직접 사용하지 않으며 기존 sort allow-list를 유지한다.

## 6. 미커밋 문서현황 변경 보존

작업 시작 당시 다음 파일에 문서현황 전체조회 변경이 미커밋 상태다.

- `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java`
- `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml`
- `backend/src/test/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalMapperTest.java`
- `backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImplTest.java`

해당 구현은 status service로 그대로 옮긴다. `offset`과 `limit`이 모두 없으면 DAO 파라미터에서 두 키를 빼 SQL `LIMIT/OFFSET`을 생략한다. 페이징 요청이면 기존 기본값 및 1~200 범위 검증을 적용한다. 매퍼 테스트는 전체 조회 SQL에 제한 절이 없음을 계속 검증한다. 이 파일들의 미커밋 수정은 덮어쓰거나 되돌리지 않는다.

## 7. 권한·오류·트랜잭션

- 모든 서비스 경로에서 기존 `LoginVO`와 tenant를 사용한다.
- 문서 목록은 기안자 또는 결재선 참여자로 확인된 문서만 대상으로 한다.
- 상세, 댓글, 파일은 기존의 문서 관련자/소유자 조건을 유지한다.
- 결재 액션은 기존 상태/역할/단계 규칙을 유지한다.
- ServiceImpl은 원래 메서드의 `@Transactional(rollbackFor = Exception.class)` 경계를 유지한다.
- 예외를 광범위하게 포착해 성공 응답으로 대체하지 않는다. 기존 `ResponseStatusException`과 다운로드/업로드 실패 전파를 유지한다.

## 8. DB 계약 및 스키마

읽기 전용 `s-erp-postgresql-readonly` MCP에서 `list_tables`를 수행해 전자결재 메인/결재선 테이블의 존재를 확인하고, `describe_table`로 `tb_electronic_approval_main`, `tb_electronic_approval_line_info` 메타데이터를 확인했다. 현재 저장소 계약도 기존 DAO와 `DocumentApproval_SQL_postgresql.xml`에서 사용한다.

이 작업은 계층 분리만 수행하므로 DDL, 데이터 변경, 날짜별 SQL/롤백 파일 또는 `db-schema.md` 변경은 계획하지 않는다. 테이블 행은 조회하지 않았다.

## 9. 검증

### 백엔드

- `DocumentApprovalWriteApiControllerTest`
- `DocumentApprovalStatusApiControllerTest`
- `DocumentApprovalInteractionApiControllerTest`
- `DocumentApprovalWriteServiceImplTest`
- `DocumentApprovalStatusServiceImplTest`
- `DocumentApprovalInteractionServiceImplTest`
- `DocumentApprovalAccessServiceImplTest`
- `DocumentApprovalMapperTest`
- 최종 전체 `mvn test`

기존 테스트 assertion은 새 service/controller test로 이동하고, 모든 테스트에서 기존 응답 필드, 권한 범위, 트랜잭션/예외, SQL 제한 및 정렬 계약을 확인한다.

### 프론트엔드 계약 및 화면 확인

- `frontend/tests/document-write-page.test.tsx`
- `frontend/tests/document-status-page.test.tsx`
- `frontend/tests/document-status-service.test.ts`
- `frontend/tests/document-approval-service.test.ts`
- 문서작성 및 문서현황 브라우저 표시를 375px, 768px, 1280px에서 확인하고 결과 폴더에 스크린샷을 보관한다. 서비스 이용에 필요한 서버를 시작하지 못하면 미확인 사실과 원인을 결과 문서에 기록한다.

## 10. 완료 기준

1. 쓰기, 현황, 공유 상호작용 Controller가 각각 기존 경로에 중복 없이 매핑된다.
2. 각 ServiceImpl이 eGovFrame `EgovAbstractServiceImpl` 패턴을 따르며 DAO/Mapper는 공유된다.
3. 문서작성과 문서현황의 기존 API 호출/응답 및 프론트엔드 동작이 바뀌지 않는다.
4. 인증 사용자/tenant/기안자/결재 참여자 및 상세 데이터 접근 권한이 보존된다.
5. 현재 미커밋된 문서현황 전체조회 동작과 회귀 테스트가 보존된다.
6. 관련 프론트엔드 계약 테스트 및 전체 백엔드 `mvn test`가 통과한다.
7. 날짜별 결과 문서, DB MCP 확인 근거, 브라우저 화면 스크린샷 및 검증 결과가 작성된다.
