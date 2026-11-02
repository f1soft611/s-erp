# 20261102_003 기안자 최종확인 DB 제약 변경

- 날짜: 2026-11-02
- 변경 내용: 결재선 CHECK 제약에 서버 전용 `FINAL_CONFIRMATION` 참여 유형과 `WAITING`/`PENDING`/`CONFIRMED` 상태 조합을 추가한다. 기존 결재선 참여자 unique 제약을 일반 참여자 문서별 중복 방지 partial unique index 및 문서당 최종확인 1행 partial unique index로 분리하고, SYSTEM 이벤트 허용 목록에 `FINAL_CONFIRMATION_CONFIRMED`를 추가한다.
- 적용 대상 테이블: `public.tb_electronic_approval_line_info`, `public.tb_common_comment`
- 영향 범위: 신규 테이블/컬럼 없이 같은 기안자를 일반 결재자 및 내부 최종확인자로 저장할 수 있고, 배포 전 진행 중 기안서는 최종 상태 처리 시 확인 대기 행을 생성한다. 업무연락과 기존 참조/승인/합의 유형 및 이벤트 값은 변경하지 않는다.
- DB 확인 근거: 기본 `s-erp-postgresql-readonly`에서 `list_tables`, 대상 테이블의 `describe_table`, CHECK/UNIQUE 제약 정의를 읽기 전용으로 확인했다. 실제 결재선에는 `uq_electronic_approval_line_participant (tenant_id, electronic_approval_id, participant_user_id)` 제약이 있어 새 기안자 확인 행과 충돌함을 확인했다. 개인정보나 tenant 행 데이터는 조회하지 않았다.
- 롤백 여부: 조건부 가능. `20261102_003_rollback.sql`은 `FINAL_CONFIRMATION` 행 또는 `FINAL_CONFIRMATION_CONFIRMED` 이벤트가 남아 있으면 예외로 중단하며 데이터를 삭제하지 않는다.
- 스크립트: `20261102_003_drafter_final_confirmation.sql`
- 실제 적용: 스키마 이력 스크립트이며 이 작업 중 DB에 적용하지 않는다.
