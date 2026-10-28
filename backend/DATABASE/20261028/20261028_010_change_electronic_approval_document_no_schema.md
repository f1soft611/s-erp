# 2026-10-28 전자결재 문서번호 스키마 변경

## 변경 사항

- `public.tb_electronic_approval_main.document_no VARCHAR(40) NOT NULL` 컬럼을 추가한다.
- 기존 문서는 `created_at` 날짜별, tenant별로 생성 시각과 내부 ID 순서로 `EA-YYYYMMDD-NNNN` 번호를 채운다.
- `(tenant_id, document_no)` 유일 제약을 추가한다.
- `tb_id_sequence`의 `ELECTRONIC_APPROVAL_NO` tenant/날짜 카운터를 backfill 최댓값으로 초기화한다.

## 영향 범위

- 대상 테이블: `tb_electronic_approval_main`, `tb_id_sequence`.
- 신규 문서의 최초 임시저장 API가 발급한 문서번호를 저장하고, 목록/상세 API에서 반환한다.
- 기존 내부 문서 ID, `eabus_no` 유형 코드, 문서 상태 및 결재선 데이터는 변경하지 않는다.
- 이 스크립트는 기존 문서 번호 데이터를 일괄 backfill하므로 운영 적용 전에 승인된 백업 및 점검 절차가 필요하다.

## 근거 및 적용 상태

- 기본 PostgreSQL MCP의 `list_tables`, `describe_table`로 두 테이블의 존재 및 주요 컬럼 계약을 확인했다. 문서 행이나 사용자/tenant 데이터는 조회하지 않았다.
- SQL은 작성 및 정적 확인 대상이다. 실제 데이터베이스에는 적용하지 않았다.

## 롤백

- 대응 파일 `20261028_010_rollback_electronic_approval_document_no.sql`은 전용 sequence 카운터, 유일 제약, 문서번호 컬럼을 제거한다.
- 롤백 시 backfill 및 신규 발급 문서번호가 모두 제거된다. 이 번호를 외부 업무 문서나 사용자에게 배포한 뒤에는 롤백하지 않는다.
