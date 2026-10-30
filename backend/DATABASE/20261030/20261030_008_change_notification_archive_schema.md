# 20261030_008 알림 보관 스키마 변경 이력

- 날짜: 2026-10-30
- 변경: 알림 수신자별 soft archive를 위한 `archived_at` 컬럼과 active page/unread partial indexes 추가
- 대상 테이블: `tb_notification`
- 영향 범위: 알림 목록과 미읽음 요약은 `archived_at IS NULL`인 행만 반환한다. 원본 댓글/쪽지와 notification row는 물리 삭제하지 않는다.
- 롤백: `20261030_008_rollback.sql`이 두 인덱스와 `archived_at`을 제거한다. 롤백하면 보관했던 알림이 다시 목록/요약에 노출된다.
- DB MCP 근거: 기본 `s-erp-postgresql-readonly`의 `list_tables`에서 `tb_notification` 존재를 확인했다. `describe_table(tb_notification)`에서 `event_type`, `read_at`, `created_at`은 있고 `archived_at`은 없음을 확인했다. 행 데이터는 조회하지 않았다.
- 적용 상태: 이 migration과 rollback은 참고 스크립트이며 실제 DB에는 적용하지 않았다.
