# 20261120_002 거래명세서 상세 연결 및 매출마감 필드 변경 이력

## 변경 정보

- 날짜: 2026-11-20
- 변경: 거래명세서 상세를 출하 상세에 연결하고 출하 상세별 명시적 매출마감 기록을 추가
- 적용 대상: `tb_sales_statement_dt`, `tb_sales_delivery_dt`, `tb_sales_statement_hd`
- 영향 범위: 미발행 출하 상세 선택, 복수 출하 상세의 거래처별 거래명세서 발행, 상세 단위 매출마감
- DB 적용 상태: 미적용. SQL은 검토·배포용이며 MCP에서 DDL/데이터 변경을 실행하지 않음.

## 스키마 변경

- `tb_sales_statement_dt.sales_delivery_detail_id BIGINT NULL`을 추가해 발행 상세와 원본 출하 상세를 연결한다.
- 기존 활성 거래명세서 상세는 같은 tenant, 헤더의 출하 ID, 상세 행 번호를 기준으로 원본 출하 상세 ID를 채운다. 일치하지 않는 활성 상세가 있으면 트랜잭션을 중단한다.
- `(tenant_id, sales_delivery_detail_id)` 부분 unique index를 추가해 하나의 원본 출하 상세가 활성 거래명세서에 중복 발행되지 않게 한다. 기존 헤더의 `(tenant_id, sales_delivery_id)` 활성 unique index는 제거한다.
- `tb_sales_delivery_dt.revenue_closed_at TIMESTAMP WITHOUT TIME ZONE NULL`, `revenue_closed_by VARCHAR(100) NULL`을 추가한다. 기존 출하·거래명세서 발행 이력은 매출마감으로 backfill하지 않으며 기존 행은 OPEN으로 남는다.
- 신규 테이블은 만들지 않는다. 매출마감 기록은 출하 상세의 두 nullable 필드로 관리한다.

## DB MCP 근거

- 기본 `s-erp-postgresql-readonly`에서 `list_tables`를 실행해 출하 헤더/상세 및 거래명세서 헤더/상세 테이블을 확인했다.
- `describe_table` 결과 현재 `tb_sales_delivery_dt`에는 매출마감 두 컬럼이 없고, `tb_sales_statement_dt`에는 원본 출하 상세 ID가 없다. 헤더에는 `sales_delivery_id`가 있으며 `tb_sales_statement_dt`의 현재 유일 인덱스는 문서 내 행 번호 `(sales_statement_id, line_no)`다.
- 제한된 PostgreSQL 시스템 카탈로그 조회로 기존 `uq_sales_statement_active_delivery`가 `(tenant_id, sales_delivery_id) WHERE use_at='Y'`임을 확인했다. 데이터 행이나 tenant 식별자는 조회·기록하지 않았다.

## 롤백 및 주의사항

- 롤백은 매출마감 시각/사용자가 하나라도 기록된 경우 중단한다.
- 활성 거래명세서에 원본 연결 누락, 부분 출하 선택, 복수 출하 묶음 또는 출하별 복수 활성 문서가 존재하면 기존 출하 단위 unique index를 안전하게 복원할 수 없으므로 롤백을 중단한다.
- 허용된 상태에서만 상세 원본 ID 및 마감 필드를 제거하고 기존 활성 출하 unique index를 복원한다. 스키마 변경 SQL과 롤백 SQL은 `backend/DATABASE/20261120`에 byte-identical 사본으로 보관한다.

## 실행 및 검증

- 실제 DB에는 SQL을 적용하지 않았다.
- 마이그레이션 전 tenant별 백업과 활성 상세의 delivery/line_no 대응 건수 검토가 필요하다. 본 변경에서는 연결 불가 행과 활성 중복 원본 ID를 사전 검사한다.
