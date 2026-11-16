# 발주 테이블 생성 변경 이력

- 변경일: 2026-11-13
- 대상 테이블: `tb_purchase_order_hd`(신규), `tb_purchase_order_dt`(신규)
- 변경 항목:
  - 헤더: 발주번호 `PO-yyyyMMdd-NNNN`, 구매처·통화 1종, 출처(`CONFIRM`/`DIRECT`), 부가세구분·포함여부, 공급가·세액·합계, 출력여부(`print_at`), 사용여부(취소)
  - 상세: 확정 행 연결(`purchase_request_detail_id`), 수량·단가·납기·창고, 발주구분·사용용도, 검사대상, 공급가·세액·합계, 입고대기 마감(`receipt_close_at`)
  - CHECK: 영세·면세는 포함 불가, 수량 > 0, Y/N 컬럼 값
- 선행: 구매요청·확정 스키마(`20261112_002`, `005`, `006`), `20261113_001`(부가세구분 공통코드)
- 영향: 신규 테이블만 추가한다. 기존 테이블은 변경하지 않는다. 확정 행 잔량 = 확정수량 − 유효 발주 행 수량 합.
- 재고량은 DB 컬럼 없이 조회 필드로만 확보한다.
- MCP 확인: `s-erp-postgresql-readonly`로 `tb_purchase_request_hd/dt`, `tb_purchase_confirm_hd`, `tb_customer_info`, `tb_warehouse`, `tb_item_partner_price` 구조를 확인했고 발주 테이블이 아직 없음을 확인했다.
- 적용 상태: SQL 스크립트만 작성했으며 실제 DB에는 적용하지 않았다.
- 롤백 여부: 제공함. 발주 상세와 헤더 테이블을 삭제한다(데이터가 있으면 함께 삭제).

적용 SQL: `20261113_002_create_purchase_order_schema.sql`

롤백 SQL: `20261113_002_rollback_purchase_order_schema.sql`
