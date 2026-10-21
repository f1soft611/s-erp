# 개인별 고정 문서 상태 필터 누수 수정 결과

## 원인

`DocumentApprovalServiceImpl.actorParams()`는 공통 문서 작업을 위해 `documentStatus=DRAFT`를 기본 파라미터로 설정한다. `listPinnedDocuments()`가 이 값을 제거하지 않은 채 고정 목록 DAO에 전달했고, 고정 문서 SQL이 상태 검색 조건을 포함한 공통 `relatedDocumentStatusFilters` 조각을 사용해 고정 목록이 임시저장 상태에 한정될 수 있었다.

회귀 테스트에서 DAO 호출 인자를 확인한 결과 실제로 `documentStatus=DRAFT`가 전달되어 RED를 확인했다.

## 수정

- 고정 문서 목록 서비스에서 공통 파라미터 생성 후 `documentStatus` 기본값을 제거했다.
- 인증 사용자, tenant, 읽기 권한 주체, scope, 업무구분, 선택 문서 ID 조건은 그대로 유지했다.
- API 계약, 프론트엔드, DB 스키마는 변경하지 않았다.

## 검증

- 단일 회귀 테스트: 수정 전 실패, 수정 후 통과.
- `mvn "-Dtest=DocumentApprovalServiceImplTest,DocumentApprovalMapperTest,DocumentApprovalApiControllerTest" test`: 104 tests, 0 failures, 0 errors.
- `git diff --check`: 통과.
- 브라우저에서 실제 사용자 고정 목록 조회는 확인하지 않았다.

## DB 확인

- 스키마 변경 없음.
- 현재 세션에서 DB MCP `s-erp-postgresql-readonly`의 `list_tables` 및 `describe_table`을 통해 `tb_electronic_approval_main`, `tb_electronic_approval_line_info`, `tb_electronic_approval_pin`의 기존 메타데이터를 확인했다. 이 수정은 조회 파라미터만 변경한다.
