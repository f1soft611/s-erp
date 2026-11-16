# 발주서 출력 스냅샷 컬럼 변경 이력

- 변경일: 2026-11-13
- 대상 테이블: `tb_purchase_order_hd`
- 변경 항목: 회사(`company_*` 9개)·구매처(`vendor_*` 8개)·발주자(`orderer_name`, `orderer_mobile_no`) 스냅샷 컬럼, 출력 일시·출력자(`printed_at`, `printed_by`) 추가. 모두 NULL 허용.
- 목적: 발주 저장 시점의 회사·구매처·발주자 정보를 보관해 마스터가 바뀌어도 과거 발주서 출력이 같게 한다. 출력 여부(`print_at`)는 `20261113_002`에 이미 있다.
- 선행: `20261113_002_create_purchase_order_schema.sql`
- 영향: 기존 발주 행은 새 컬럼이 NULL이며 출력 시 현재 회사·구매처·발주자 정보로 대체한다. 기존 컬럼·제약은 변경하지 않는다. 이후 발주 저장은 서버가 한 문장에서 복사한다.
- MCP 확인: `s-erp-postgresql-readonly`로 `tb_tenant`(회사 정보·직인·로고), `tb_customer_info`(구매처 연락처·담당자), `tb_user`(이름·휴대폰번호), 영업 `tb_sales_statement_hd` 스냅샷 컬럼 구조를 확인했다.
- 적용 상태: SQL 스크립트만 작성했으며 실제 DB에는 적용하지 않았다.
- 롤백 여부: 제공함. 추가한 컬럼을 삭제하므로 저장된 스냅샷과 출력 이력이 사라진다.

적용 SQL: `20261113_006_alter_purchase_order_print_snapshot.sql`

롤백 SQL: `20261113_006_rollback_purchase_order_print_snapshot.sql`
