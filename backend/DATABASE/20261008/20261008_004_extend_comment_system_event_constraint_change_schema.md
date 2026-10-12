# 20261008_004 공통 시스템 댓글 이벤트 제약 변경 이력

## 변경 정보

- 변경일: 2026-10-08
- 대상 DB: `s-erp_central` (PostgreSQL)
- 적용 상태: 미적용 migration 초안
- 대상 테이블: `public.tb_common_comment`
- 영향 범위: 전자결재 문서 임시저장 시스템 이력
- 롤백 여부: 롤백 스크립트 제공. `DRAFT_SAVED` 시스템 이력이 남아 있으면 롤백은 중단됨.

## 변경 내용

- `chk_tb_common_comment_event_type`의 SYSTEM 허용 이벤트에 `DRAFT_SAVED`를 추가한다.
- USER 댓글은 계속 `event_type IS NULL`이어야 하며, 기존 `APPROVED`, `REJECTED`, `RETURNED` SYSTEM 이벤트 제약은 유지한다.
- 신규 컬럼이나 테이블은 추가하지 않는다.

## 계약 확인 및 적용 주의

- 현재 세션에서는 읽기 전용 DB MCP 메타데이터 도구를 사용할 수 없어 중앙 DB의 실제 제약 정의를 재확인하지 못했다.
- 대체 근거는 저장소의 `20261008_003_create_document_approval_schema.sql`이며, 해당 DDL의 CHECK 허용 목록은 `APPROVED`, `REJECTED`, `RETURNED`로 제한되어 있다.
- 이 파일은 저장소의 추정 계약을 기준으로 작성한 migration 초안이다. 실제 DB 제약 정의를 확인하고 운영 검토/승인하기 전에는 실행하지 않는다.
- 롤백은 `DRAFT_SAVED` 행이 존재하면 예외를 발생시켜 제약 축소가 데이터와 충돌하지 않게 한다.
