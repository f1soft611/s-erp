# 수주·출하 흐름 데이터 초기화 스크립트 기록

- **작성일:** 2026-11-12
- **구분:** 운영자 실행 데이터 정리 스크립트 (스키마 변경 없음)
- **목적:** 명시한 한 테넌트의 수주·계획·출하 흐름을 초기화해 새로 등록할 수 있도록 한다.
- **영향 테이블:** `tb_sales_order_hd`, `tb_sales_order_dt`, `tb_sales_delivery_plan_hd`, `tb_sales_delivery_plan_dt`, `tb_sales_delivery_hd`, `tb_sales_delivery_dt`, `tb_sales_statement_hd`, `tb_sales_statement_dt`, `tb_purchase_request_hd`, `tb_purchase_request_dt`, 조건부 `tb_purchase_confirm_hd`.
- **삭제 범위:** 입력한 `tenant_id`에 한정한다. 수주 연결 구매요청 상세가 있으면 해당 구매요청 문서 전체를 삭제하고, 그 결과 참조가 사라진 구매확정 헤더만 삭제한다. 대상 출하의 거래명세서도 함께 삭제한다.
- **보존 범위:** 테넌트·거래처·품목·창고 등 마스터, 다른 테넌트, 무관한 구매요청/구매확정, PK 및 문서번호 시퀀스.
- **실행 방식:** SQL은 단일 트랜잭션이며 기본 마지막 명령은 `ROLLBACK`이다. 출력된 영향 건수 및 별도 백업을 확인한 운영자가 명시적으로 `COMMIT`으로 바꾸어 실행해야 한다.
- **롤백 여부:** 기본 검토 실행은 트랜잭션 롤백된다. 커밋 후 데이터 복구용 역 SQL은 제공하지 않으며 백업 복원이 필요하다.
- **DB 적용:** 이 작업에서는 적용하지 않았다.
- **메타데이터 근거:** PostgreSQL MCP의 테이블 목록, 관련 테이블 컬럼 및 FK 메타데이터. 업무 데이터 행은 조회하지 않았다.

스키마가 변경되지 않으므로 `db-schema.md` 변경이나 스키마 롤백 파일은 없다.
