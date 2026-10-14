# 20261012_002 전자결재 논리 삭제 스키마 변경 이력

## 변경 정보

- 변경일: 2026-10-12
- 대상 DB: PostgreSQL `public`
- 적용 상태: 검토용 migration 초안. 본 작업에서는 운영 DB에 적용하지 않음.
- 대상 테이블: `tb_electronic_approval_main`, `tb_common_comment`
- 영향 범위: 전자결재 문서 삭제 표시, SYSTEM 이벤트 CHECK, approval 문서 조회/접근 경로
- 롤백 여부: 롤백 SQL 제공. 논리 삭제 문서 또는 `DELETED` SYSTEM 이벤트가 존재하면 데이터 보존을 위해 롤백을 중단함.

## 변경 내용

- `tb_electronic_approval_main.deleted_yn VARCHAR(1) NOT NULL DEFAULT 'N'`과 `Y/N` CHECK 제약을 추가한다.
- 기존 `chk_tb_common_comment_event_type`의 USER NULL event 규칙, SYSTEM 필수/비공백 규칙 및 기존 허용 이벤트를 유지하고 `DELETED`를 추가한다.
- 삭제는 `document_status` 변경이 아니라 논리 삭제 표시로 표현한다. 관련 문서 상태 CHECK 및 결재선 스키마는 변경하지 않는다.
- SYSTEM 삭제 이벤트는 `owner_type='APPROVAL'`, `owner_id=electronic_approval_id`, `comment_type='SYSTEM'`, `event_type='DELETED'`로 기록한다. 이벤트와 문서 표시 갱신은 애플리케이션 transaction에서 함께 처리한다.
- 기존 `tb_common_comment.deleted_yn`은 사용자 댓글의 soft-delete 용도이며 이번 변경은 이를 변경하지 않는다.
- 기존 문서, 결재선, SYSTEM/USER 댓글, 첨부 메타데이터와 이미지 파일은 이 변경으로 물리 삭제하지 않는다.

## 계약 확인 및 적용 전제

- 구현 전 `s-erp-postgresql-readonly`의 `list_tables`, 관련 테이블 `describe_table`, 제한된 `pg_constraint` catalog SELECT를 사용했다. 실제 행 데이터는 조회하지 않았다.
- 확인한 현행 스키마에는 `tb_electronic_approval_main.deleted_yn`이 없고, `chk_tb_common_comment_event_type`은 `APPROVED`, `REJECTED`, `RETURNED`, `DRAFT_SAVED`, `SUBMITTED`, `RESUBMITTED`, `COMPLETED`를 허용한다.
- SQL은 위 계약을 전제로 하므로 적용 승인 직전에 동일 테이블/제약을 재확인해야 한다. migration 적용 전에 `deleted_yn`을 참조하는 애플리케이션 코드를 배포하지 않는다.
- 사용자/tenant 행 데이터, 계정 정보, 자격 증명 및 연결 문자열은 조회하거나 기록하지 않았다.

## 영향 및 롤백

- 영향 경로: 문서 목록, 요약/알림, 상세, 참여자 검증, 결재 처리 잠금, 임시저장 소유/상태 조회, 댓글·첨부·본문 이미지의 approval 참여자 접근 검증.
- 롤백 SQL은 `tb_electronic_approval_main.deleted_yn='Y'` 문서 또는 `owner_type='APPROVAL'`의 SYSTEM `DELETED` 이벤트가 존재하면 예외로 중단한다.
- 안전 조건을 만족할 때만 event CHECK를 직전 허용 목록으로 되돌리고 `deleted_yn` CHECK/컬럼을 제거한다.
- migration을 실제 운영 DB에 적용하지 않았으며 롤백도 실행하지 않았다.
