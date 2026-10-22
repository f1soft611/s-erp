# 개인별 고정 문서 상태 필터 누수 수정 계획

> **작업 절차:** 각 단계를 체크하며 TDD로 진행한다. 작업지시서와 상세 사양서를 기준으로 수정한다.

**목표:** 개인별 고정 문서 조회가 공통 파라미터의 기본 `DRAFT` 조건을 상속하지 않고 사용자가 고정한 모든 접근 가능 상태 문서를 반환하도록 한다.

**접근 방식:** 공통 actor 파라미터의 기본 `documentStatus=DRAFT`가 고정 목록 SQL의 선택 검색조건에 유입되는 원인을 서비스 경계에서 차단한다. 회귀 테스트는 DAO에 전달되는 고정 목록 파라미터에 기본 상태 필터가 포함되지 않는지 검증한다.

**기술 스택:** Java, Spring service, MyBatis, JUnit 5, Mockito.

---

## 변경 파일 및 책임

- 수정: `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java`
  - `listPinnedDocuments`에서 공통 actor의 기본 문서 상태를 제거하고 나머지 인증·조회 필터 파라미터를 유지한다.
- 수정: `backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImplTest.java`
  - 고정 문서 DAO 파라미터가 기본 `DRAFT` 필터를 전달하지 않는 회귀 테스트를 추가한다.
- 생성: `docs/directions/20261021/20261021_003_pinned_document_status_filter_fix_work_instruction.md`
- 생성: `docs/plan/20261021/20261021_003_pinned_document_status_filter_fix_plan.md`
- 생성: `docs/spec/20261021/20261021_003_pinned_document_status_filter_fix_spec.md`
- 생성: `docs/result/20261021/pinned-document-status-filter-fix/result.md`

## 작업 1: 고정 문서 서비스 회귀 테스트

- [x] 기존 `pinnedListUsesScopeAndFilterWithCurrentAuthenticatedIdentityOnly` 테스트의 DAO 인자 검증에 `!params.containsKey("documentStatus")` 조건을 추가한다.
- [x] `cd backend; mvn "-Dtest=DocumentApprovalServiceImplTest#pinnedListUsesScopeAndFilterWithCurrentAuthenticatedIdentityOnly" test`를 실행한다.
- [x] 공통 actor 파라미터에서 `DRAFT`가 전달되어 테스트가 실패하는지 확인한다.

## 작업 2: 고정 목록 상태 필터 제거

- [x] `listPinnedDocuments`에서 `actorParams(user)` 생성 직후 `params.remove("documentStatus")`를 수행한다.
- [x] tenant, userId, drafterId, participantUserId, scope, documentType, electronicApprovalId 파라미터가 기존대로 설정되는지 유지한다.
- [x] 동일한 단일 테스트를 다시 실행해 통과를 확인한다.

## 작업 3: 관련 회귀 검증 및 결과 기록

- [x] `cd backend; mvn "-Dtest=DocumentApprovalServiceImplTest,DocumentApprovalMapperTest,DocumentApprovalApiControllerTest" test`를 실행한다.
- [x] 프론트엔드 및 DB 스키마를 변경하지 않았음을 확인한다.
- [x] 결과 문서에 재현 원인, 최소 수정, 테스트 결과, DB 스키마 변경 없음 및 현재 세션에서 선행 확인된 DB MCP 메타데이터를 기록한다.
- [x] 기존 사용자 미커밋 변경은 유지한다.
