# 20261020_007 전자결재 개인별 고정 테이블 변경 이력

- 날짜: 2026-10-20
- 변경 내용: 사용자별 전자결재 문서 고정 관계를 저장하는 `tb_electronic_approval_pin`을 추가한다.
- 적용 대상 테이블: `tb_electronic_approval_pin`, `tb_tenant`, `tb_user`, `tb_electronic_approval_main`
- 영향 범위: tenant·사용자·문서별 중복 고정을 PK로 차단하고, tenant와 사용자 및 같은 tenant의 문서를 FK로 연결한다. 사용자별 목록 조회는 PK 선두 컬럼 인덱스를 사용하고, 문서 FK cascade 조회를 위해 `(tenant_id, electronic_approval_id)` 인덱스를 추가한다.
- 데이터 영향: 새 관계 테이블만 생성하며 기존 행의 변환이나 backfill은 없다.
- 롤백 여부: 가능. `20261020_007_rollback_electronic_approval_pin.sql`로 신규 테이블과 해당 데이터가 제거된다.
- DB 적용 상태: 검토용 SQL 초안이며 실제 DB에는 적용하지 않았다.
- 메타데이터 근거: 읽기 전용 `s-erp-postgresql-readonly` MCP에서 문서 테이블, 사용자 테이블, tenant 테이블의 현재 컬럼을 확인했다. 행 데이터는 조회하지 않았다.
