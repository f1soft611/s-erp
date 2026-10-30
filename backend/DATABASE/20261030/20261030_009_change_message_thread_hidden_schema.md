# 20261030_009 쪽지 대화방 삭제(참여자별 숨김) 스키마 변경 이력

- 날짜: 2026-10-30
- 변경: 1:1 쪽지 대화방을 참여자 본인에게만 숨기기 위한 `participant_a_hidden_at`, `participant_b_hidden_at` nullable 컬럼 추가
- 대상 테이블: `tb_direct_message_thread`
- 영향 범위:
  - 대화방 삭제 API는 현재 사용자 쪽 `*_hidden_at`에 현재 시각을 기록하고, 해당 대화에서 받은 미읽음 쪽지와 연결된 새 쪽지 알림을 읽음 처리한다. 쪽지 row는 물리 삭제하지 않는다.
  - 대화 목록은 숨김 시각이 없거나, 숨김 시각 이후 메시지가 있는 대화만 반환한다. 상대방이 새 쪽지를 보내면 대화방이 다시 나타나며, 숨긴 사용자에게는 숨김 시각 이후 메시지만 보인다.
  - 상대방의 목록·메시지에는 영향이 없다.
- 롤백: `20261030_009_rollback.sql`이 두 컬럼을 제거한다. 롤백하면 숨긴 대화방과 이전 메시지가 다시 노출된다.
- DB MCP 근거: 기본 `s-erp-postgresql-readonly`의 `describe_table(tb_direct_message_thread)`로 현재 컬럼(`thread_id`, `tenant_id`, `participant_a_user_id`, `participant_b_user_id`, `subject`, `created_at`, `updated_at`)과 숨김 컬럼 부재를 확인했다. 행 데이터는 조회하지 않았다.
- 적용 상태: 이 migration과 rollback은 참고 스크립트이며 실제 DB에는 적용하지 않았다. 기능을 사용하려면 migration 적용 후 백엔드를 재시작해야 한다.
