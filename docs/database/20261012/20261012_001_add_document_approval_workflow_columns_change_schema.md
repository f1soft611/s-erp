# 20261012_001 전자결재 순차 처리 스키마 변경 이력

## 변경 정보

- 변경일: 2026-10-12
- 대상 DB: `s-erp_central` (PostgreSQL)
- 적용 상태: 검토용 migration 초안. 운영 DB에 적용하지 않음.
- 대상 테이블: `tb_electronic_approval_main`, `tb_electronic_approval_line_info`, `tb_common_comment`
- 영향 범위: 문서 번호, 순차 결재 대기 시각, 최종 상태 및 시스템 이벤트 계약
- 롤백 여부: 롤백 SQL 제공. 신규 상태·이벤트·대기 시각 자료가 존재하면 롤백을 중단함.

## 변경 내용

- `tb_electronic_approval_main.eabus_no VARCHAR(3)`를 추가하고 기존 문서 유형별 번호를 backfill한다. 지원하지 않는 문서 유형이 있으면 migration이 예외로 중단되며, 서버는 이후 생성·수정 때도 문서 유형으로 번호를 결정한다.
- 문서 상태 CHECK에 `REJECTED`를 추가한다.
- `tb_electronic_approval_line_info.pending_at TIMESTAMP`와 상태별 CHECK를 추가한다. `PENDING` 행은 시각이 필수이고 `WAITING` 및 `REFERENCE` 행은 NULL이어야 한다. 처리 완료 행은 `action_at`이 필수이며 실제 활성화 시각을 보존한다. 기존 활성 `PENDING` 또는 상태 누락 행이 있으면 정확한 시각을 추측하지 않고 migration을 중단해 별도 reconciliation을 요구한다.
- `tb_common_comment` 시스템 이벤트 CHECK에 `SUBMITTED`, `RESUBMITTED`, `COMPLETED`를 추가한다. `APPROVED`, `REJECTED`, `RETURNED`, `DRAFT_SAVED` 및 USER의 NULL event 계약은 유지한다.
- 신규 테이블, FK, 인덱스는 추가하지 않는다.

## 적용 및 롤백 순서

1. 읽기 전용 DB 메타데이터에서 실제 컬럼·제약 이름과 적용 여부를 확인하고 현행 스키마가 이 migration의 전제와 일치하는지 검토한다.
2. 변경 승인 후 forward SQL을 단일 트랜잭션으로 적용하고 문서 유형별 번호·상태 CHECK를 확인한다.
3. 롤백 시 반려 문서, `pending_at` 값 또는 신규 workflow event가 있으면 rollback SQL은 예외로 전체 롤백한다. 데이터를 삭제하거나 이벤트를 변환해 역행하지 않는다.
4. rollback은 시스템 이벤트를 `20261008_004`가 의도한 DRAFT_SAVED 포함 허용 목록으로 복구한다. 단, `20261008_004` 자체는 저장소 기록상 미적용 초안이므로 실제 DB 계약 확인 없이 순서나 실행을 추정하지 않는다.

## 계약 확인 및 대체 근거

- 이 구현 세션에서는 `s-erp-postgresql-readonly` MCP 도구가 노출되지 않아 실제 DB 메타데이터를 재조회하지 못했다. 따라서 이 SQL은 저장소 기준 검토용 초안이며 실제 적용본이 아니다.
- 대체 근거는 `docs/database/db-schema.md`, `backend/DATABASE/20261008/20261008_003_create_document_approval_schema.sql`, `backend/DATABASE/20261008/20261008_004_extend_comment_system_event_constraint.sql` 및 동일 경로의 `docs/database` 사본이다. `20261008_003` 변경 이력은 미적용 초안이고 `20261008_004`도 미적용 초안으로 기록돼 있다. 두 저장소 사본의 SHA-256은 각각 일치했다.
- 실제 운영 제약 정의와 과거 `DRAFT_SAVED` CHECK 오류 간 불일치는 해소되지 않았다. 적용 전 DB 담당자가 실제 constraint 정의, 미적용 변경의 배포 순서 및 적용 상태를 확인해야 한다.
- 개인정보·tenant 행 데이터, 자격 증명 및 연결 문자열은 조회하거나 기록하지 않았다.
