# 20261029_001 참조 확인 상태 및 시스템 이벤트 제약 변경

- 날짜: 2026-10-29
- 변경 내용: 참조(`REFERENCE`) 참여자의 `CONFIRMED` 상태를 허용한다. 확인 시 `pending_at`과 `action_comment`는 NULL, `action_at`은 NOT NULL 조건으로 제한한다. 공통 댓글 SYSTEM 이벤트 허용 목록에 `REFERENCE_CONFIRMED`를 추가한다.
- 적용 대상 테이블: `public.tb_electronic_approval_line_info`, `public.tb_common_comment`
- 영향 범위: 사용자별 참조 확인 상태 및 기존 SYSTEM 타임라인 이벤트. 신규 컬럼/테이블과 기존 참여자 행 데이터 변환은 없다.
- DB 확인 근거: `s-erp-postgresql-readonly`에서 `list_tables`, 두 테이블의 `describe_table`, 제한된 `pg_constraint` 메타데이터 조회를 수행했다. 기존 참여자 CHECK는 REFERENCE action 필드를 모두 NULL로 제한하고, SYSTEM 이벤트 CHECK는 `REFERENCE_CONFIRMED`를 허용하지 않았다. 행 데이터는 조회하지 않았다.
- 롤백 여부: 가능. `20261029_001_rollback_reference_confirmation_constraints.sql`은 두 제약을 기존 허용조건으로 복구한다. 롤백 전 `CONFIRMED` 참여 행 또는 `REFERENCE_CONFIRMED` 이벤트가 남아 있으면 기존 제약을 재적용할 수 없으므로 해당 신규 기능 데이터의 정리 여부를 별도로 확인해야 한다.
- 스크립트: `20261029_001_reference_confirmation_constraints.sql`
- 실제 적용: 본 변경은 스키마 이력 스크립트이며 이 작업 중 DB에 적용하지 않는다.
