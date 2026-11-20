# 품목 기본 거래처 변경 이력

- 변경일: 2026-11-20
- 대상 테이블: `tb_item_default_supplier`(신규), `tb_item_partner_price`(컬럼 추가)
- 변경 내용
  - 신규 `tb_item_default_supplier`: 품목당 매입 기본 거래처 1행. 유일 키 `(tenant_id, material_id)`, 복합 FK(품목·거래처 `(id, tenant_id)`), 인덱스 `(tenant_id, customer_id)`, 감사 컬럼(`created_by/at`, `updated_by/at`).
  - `tb_item_partner_price.order_type VARCHAR(50)` 추가: 발주구분(공통코드 `PURCHASE_ORDER_TYPE` 코드값), 비워도 됨, 매입 행에서 사용.
  - 초기 데이터: 사용 중 매입 단가가 있는 사용 중 거래처가 **정확히 1곳인 품목**만 그 거래처를 기본으로 지정한다(`created_by = 'migration'`). 여러 곳인 품목은 직접 지정한다.
- 사유: 구매요청확정에서 요청을 불러올 때 품목의 기본 거래처와 단가를 자동 설정하고, 단가등록의 "거래처 없는 단가 = 기본단가" 해석을 "공통단가(예비) + 기본 거래처 지정"으로 바꾼다. 기본 거래처는 기간별로 행이 늘어나는 단가 행이 아니라 별도 테이블에 둔다.
- 영향: 단가등록·구매요청확정 화면과 API(작업 009). 기존 단가 행과 매출 단가는 바뀌지 않는다.
- MCP 확인: `s-erp-postgresql-readonly`로 `tb_material_info`(`uq_material_id_tenant_id`)와 `tb_customer_info`(`uq_customer_id_tenant_id`)의 복합 유일 키, `tb_item_partner_price` 제약, 새 테이블·컬럼 미존재를 확인했다.
- 적용 상태: SQL 스크립트만 작성했으며 실제 DB에는 적용하지 않았다.
- 롤백 여부: 제공함. 사용자가 직접 지정·수정한 기본 거래처나 입력한 발주구분이 있으면 중단하고, 초기 이전 데이터만 있으면 테이블과 컬럼을 삭제한다.

적용 SQL: `20261120_006_create_item_default_supplier.sql`

롤백 SQL: `20261120_006_rollback_create_item_default_supplier.sql`
