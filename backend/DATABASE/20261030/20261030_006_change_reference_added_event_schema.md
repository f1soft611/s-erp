# 20261030_006 `REFERENCE_ADDED` SYSTEM 이벤트 제약 변경

- 날짜: 2026-10-30
- 변경 내용: 공통 댓글 SYSTEM 이벤트 허용 목록에 `REFERENCE_ADDED`를 추가한다.
- 적용 대상 테이블: `public.tb_common_comment`
- 영향 범위: 전자결재 참조자 추가 SYSTEM 타임라인 이력. 테이블/컬럼/인덱스와 기존 데이터 구조 변경은 없다.
- DB 확인 근거: 기본 `s-erp-postgresql-readonly`에서 `list_tables`, `tb_common_comment` 메타데이터 조회 및 `chk_tb_common_comment_event_type` 정의를 확인했다. 현재 제약은 `REFERENCE_CONFIRMED`를 허용하지만 `REFERENCE_ADDED`는 허용하지 않는다. 행 데이터는 조회하지 않았다.
- 롤백 여부: 가능. `20261030_006_rollback.sql`은 허용 목록을 변경 전 값으로 복구한다. 롤백 전에 `REFERENCE_ADDED` 이벤트 행이 남아 있으면 CHECK 재적용이 실패하므로, 해당 이벤트 데이터의 보존/정리 방침을 먼저 확인해야 한다.
- 스크립트: `20261030_006_add_reference_added_event.sql`
- 실제 적용: 스키마 이력 스크립트이며 이 작업 중 DB에 적용하지 않는다.
