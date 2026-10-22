# 문서작성 일반 페이지 고정 문서 포함 계획서

## 목표와 구성

[작업지시서](../../directions/20261021/20261021_006_document_page_include_pins_work_instruction.md)에 따라 실제 페이지 SQL과 count SQL을 고정 여부에 독립적으로 만든다. 응답 구조와 프론트엔드에서 고정 상태를 판별하는 기존 별도 조회는 유지한다.

## 실행 단계

1. `DocumentApprovalMapperTest.writeDocumentPagesExcludeCurrentUsersPinsAndUseStableOffsetOrdering`를 고정 포함 사양으로 변경한다.
   - 페이지/count 모두 `tb_electronic_approval_pin`을 참조하지 않는지 검사한다.
   - 기존 접근/필터 SQL 및 안정적인 정렬과 LIMIT/OFFSET 검사는 유지한다.
2. `mvn -Dtest=DocumentApprovalMapperTest test`로 기존 SQL에서 실패함을 확인한다.
3. `DocumentApproval_SQL_postgresql.xml`의 `relatedWriteDocumentFilters`에서 pin `NOT EXISTS` 블록만 제거한다.
4. 매퍼/서비스/컨트롤러 테스트를 실행하고 결과를 기록한다.
5. 기존 실행 서버는 임의 종료하지 않는다. 서버가 새 SQL을 실행하는지 확인하지 못한 경우 재시작 전 상태를 성공으로 보고하지 않는다.

스키마/데이터 변경이 없으므로 마이그레이션 SQL은 생성하지 않는다.
