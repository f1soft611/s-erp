# 20261014_003 결재 취소 이벤트 스키마 변경 이력

- 변경일: 2026-10-14
- 변경 내용: 기안 상신 취소 및 결재자 승인 취소를 기록하는 시스템 이벤트를 허용한다.
- 적용 대상: `tb_common_comment.chk_tb_common_comment_event_type`
- 영향 범위: 전자결재 취소 트랜잭션이 `SUBMISSION_CANCELED`, `APPROVAL_CANCELED` 시스템 이력을 저장할 수 있다.
- 기존 계약: `APPROVED`, `REJECTED`, `RETURNED`, `DRAFT_SAVED`, `SUBMITTED`, `RESUBMITTED`, `COMPLETED`, `DELETED` 및 USER 이벤트의 NULL 조건을 유지한다.
- 데이터 영향: 신규 테이블/컬럼 및 기존 행 데이터 변경은 없다. CHECK 제약 허용값만 확장한다.
- 롤백: `20261014_003_rollback_approval_cancellation_events.sql`을 사용한다. 신규 취소 이벤트를 참조하는 SYSTEM 행이 있으면 롤백을 거부한다.
- MCP 확인: 읽기 전용 PostgreSQL MCP에서 실제 `tb_common_comment` 컬럼 및 CHECK 제약의 기존 이벤트 목록과 USER/SYSTEM 조건을 확인했다. MCP에서 DDL은 실행하지 않았다.
- 적용 상태: 검토 및 배포용 SQL 초안이며 실제 데이터베이스에는 적용하지 않았다.
