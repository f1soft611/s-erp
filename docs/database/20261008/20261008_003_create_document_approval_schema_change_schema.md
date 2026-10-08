# 20261008_003 문서 결재 저장 스키마 변경 이력

## 변경 정보

- 변경일: 2026-10-08
- 대상 DB: `s-erp_central` (PostgreSQL)
- 적용 상태: 미적용 SQL 초안. 어떠한 DB에도 실행하지 않음.
- forward: `20261008_003_create_document_approval_schema.sql`
- rollback: `20261008_003_create_document_approval_schema_rollback.sql`

## 변경 내용

### 신규 테이블

- `tb_electronic_approval_main`: tenant별 문서 유형/상태, 제목, Tiptap JSON/HTML/검색용 본문, 작성자 및 시각 저장.
- `tb_electronic_approval_line_info`: 결재/합의/참조 참여자를 단계와 순서로 저장하고 결재자의 처리 상태, 처리 시각, 의견을 보존.
- `tb_common_comment_like`: tenant/댓글/인증 사용자의 좋아요 관계를 저장하고 중복을 방지.

### 기존 테이블 변경

- `tb_common_comment.comment_type`: 기존 행과 신규 일반 댓글의 기본값 `USER`, 시스템 처리 메시지는 `SYSTEM`.
- `tb_common_comment.event_type`: SYSTEM 행의 안정된 이벤트 코드. USER 행에서는 NULL.
- `tb_common_comment(tenant_id, comment_id)` unique 제약: 댓글 좋아요에서 tenant가 일치하는 복합 FK를 사용하도록 추가.

## 영향 범위와 호환성

- 기존 공통 댓글은 추가 컬럼 기본값에 따라 `USER`로 유지된다. 기존 내용, 대댓글, soft delete 및 수정 행위자 필드는 변경하지 않는다.
- 기존 공통 파일과 세 기안 업무 분류 테이블은 수정/복제하지 않는다. 본문에서 선택한 작성 양식은 기존 양식 PK를 참조한다.
- 참조 참여자는 `REFERENCE` 유형이며 결재 처리 상태/시각/의견을 가질 수 없다.
- SYSTEM 댓글 수정/삭제/답글/좋아요 차단 및 문서별 접근 권한 검사는 이 DDL에 포함되지 않으며 API 연결 전에 서비스 계층에 구현해야 한다.
- 본문/결재선 저장 및 결재선 처리/SYSTEM 댓글 추가의 원자성은 후속 서비스 트랜잭션에서 구현한다.

## 적용 및 롤백 순서

1. 사전 검토 및 승인 후 forward SQL을 단일 트랜잭션으로 적용한다.
2. 응용 서비스 배포 전 스키마 확인 및 기존 일반 댓글 조회 호환성을 검증한다.
3. 롤백이 필요한 경우 좋아요 → 공통 댓글 추가 제약/컬럼 → 결재선 → 결재 본문 순서로 해당 migration의 rollback만 적용한다.
4. 실제 적용 전에는 백업 및 배포 시간대/기존 댓글 테이블 잠금 영향을 운영 절차에 따라 검토한다.

## 계약 확인 근거

- 앞선 설계 단계에서 읽기 전용 DB MCP로 중앙/tenant 테이블 목록 및 공통 테이블 존재 여부를 확인했다. 현재 실행 맥락에는 MCP 호출 도구가 노출되지 않아 메타데이터를 재조회하지 않았다.
- 대체 로컬 근거: `docs/database/db-schema.md`, `backend/DATABASE/20260916/20260916_001_create_common_attachment_schema.sql`, `backend/DATABASE/20260918/20260918_008_notice_gubun_actor_audit.sql`, `backend/DATABASE/20261001/20261001_001_haccp_drafting_work_schema.sql`, `LoginVO`, 공통 댓글 VO/Mapper 및 문서작성 UI 타입.
- DB 행 데이터, 자격 증명 또는 연결 문자열은 조회/기록하지 않았다.
