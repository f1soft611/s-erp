# 20261116_001 공통 알림 전자결재 이벤트 스키마 변경 이력

- 날짜: 2026-11-16
- 변경: `tb_notification`의 `chk_notification_event_source`에 `APPROVAL_WORKFLOW` / `APPROVAL_STATUS_EVENT` 조합을 추가
- 대상 테이블: `tb_notification`
- 영향 범위: 전자결재 시스템 이력 댓글을 알림 발생원으로 저장하고 기존 알림함/푸시 경로에서 사용한다. 신규 테이블과 컬럼은 없다.
- 롤백: 신규 조합 알림 행을 삭제한 후 기존 두 이벤트/발생원 조합만 허용하는 CHECK 제약으로 복원한다. 롤백 시 전자결재 워크플로 알림 이력은 제거된다.
- DB MCP 근거: 기본 `s-erp-postgresql-readonly`의 `list_tables`와 `describe_table`로 `tb_notification`, `tb_electronic_approval_main`, `tb_electronic_approval_line_info`의 존재 및 컬럼을 확인했다. `tb_notification` CHECK 제약을 확인하는 제한 metadata 조회는 실패해 라이브 CHECK 정의는 미확인이다.
- 대체 근거: `docs/database/20261030/20261030_005_create_notification_message_schema.sql`에 기존 `chk_notification_event_source` 정의가 있으며, 현재 MCP로 확인된 컬럼 계약은 해당 DDL의 `tb_notification` 구조와 일치한다.
- 적용 상태: 참고 migration이며 실제 DB에는 적용하지 않았다.
