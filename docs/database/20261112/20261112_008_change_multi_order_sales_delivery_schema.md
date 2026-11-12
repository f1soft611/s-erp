# 출하등록 다중 수주 연결 스키마 변경

- 날짜: 2026-11-12
- 대상: `tb_sales_delivery_dt`
- 내용: 상세 수주의 ID를 헤더 대표 수주 ID와 같게 제한하던 `fk_sales_delivery_dt_hd_order`를 제거한다. 상세의 수주·수주상세·계획상세·품목·tenant 참조와 헤더/상세의 출하구분·tenant 참조는 유지한다.
- 영향: 하나의 ORDER 출하 헤더에 동일 거래처의 여러 수주 상세를 저장할 수 있다. 헤더 `sales_order_id`는 첫 상세 수주의 대표값으로 유지하고 상세 `sales_order_id`가 각 행의 실제 원 수주를 보존한다.
- 검증 근거: 읽기 전용 PostgreSQL MCP의 `list_tables`, `describe_table(tb_sales_delivery_hd, tb_sales_delivery_dt)`, 외래키 메타데이터 조회에서 상세 `sales_order_id` 컬럼과 `fk_sales_delivery_dt_hd_order` 및 상세별 수주/계획 외래키를 확인했다. 행 데이터는 조회하지 않았다.
- 롤백: `20261112_008_rollback_multi_order_sales_delivery.sql`은 헤더 대표 수주와 다른 상세 수주가 하나라도 있으면 중단한다. 다중 수주 출하를 단일 수주 구조로 변환해야 한다면 데이터 이관 정책을 별도로 마련해야 한다.
- 적용 상태: 스크립트만 작성했으며 실제 DB에는 적용하지 않았다.
