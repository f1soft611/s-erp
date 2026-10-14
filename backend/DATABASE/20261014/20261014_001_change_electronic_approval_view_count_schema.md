# 20261014_001 전자결재 조회수 스키마 변경 이력

- 변경일: 2026-10-14
- 변경 내용: 전자결재 상세의 사용자별 최초 조회수와 조회 이력 추가
- 적용 대상: `tb_electronic_approval_main`, `tb_electronic_approval_view_history`
- 영향 범위: 권한이 확인된 전자결재 상세 조회 API의 사용자별 중복 방지 및 조회수 반환
- 중복 기준: `(tenant_id, electronic_approval_id, login_id)` 복합 유니크 제약
- 참조 관계: `tb_tenant`, `tb_electronic_approval_main`, `tb_login_account`
- 데이터 영향: 신규 조회 이력 테이블을 생성하고 기존 문서의 `view_count`를 0으로 초기화한다. 기존 문서·결재선·댓글 데이터는 수정하지 않는다.
- 멱등성: 컬럼, 제약, 테이블, 인덱스 생성에 `IF NOT EXISTS` 또는 제약 존재 확인을 사용한다.
- 롤백: `20261014_001_rollback.sql`로 이력 테이블과 조회수 컬럼/제약을 제거할 수 있다. 롤백 시 누적 조회수와 조회 이력이 삭제되므로 애플리케이션에서 조회수 필드 사용을 중단한 뒤 수행한다.
- MCP 확인: 읽기 전용 PostgreSQL MCP에서 대상 테이블, 컬럼, PK/복합 unique 키를 확인했다. MCP는 조회 근거 확인에만 사용했으며 DDL은 실행하지 않았다.
- 적용 상태: 검토 및 배포용 SQL 초안이며 실제 데이터베이스에는 적용하지 않았다.
