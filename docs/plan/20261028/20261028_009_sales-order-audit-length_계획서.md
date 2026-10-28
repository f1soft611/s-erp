# 수주 감사 사용자 길이 보정 Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task.

**Goal:** 로그인 코드의 최대 100자를 수주 audit 컬럼에 손실 없이 저장한다.

**Architecture:** 서비스와 Mapper의 인증 사용자 전달은 유지하고 DB 컬럼 길이만 원본 계약과 맞춘다. 기존 생성 DDL은 이력으로 보존하며 신규 환경도 생성 후 이번 변경 SQL을 적용한다.

**Tech Stack:** PostgreSQL, Java/Spring/eGovFrame, MyBatis, Maven/JUnit.

## 근거

- [작업지시서](../../directions/20261028/20261028_009_sales-order-audit-length_작업지시서.md)

## Task 1: 계약과 실패 재현

- [x] 기본 MCP `list_tables` → 두 수주 테이블 `describe_table` → `information_schema.columns` 제한 조회로 문자열 길이를 확인한다.
- [x] 로그인 Mapper, 수주 Controller/Service/Mapper에서 사용자 키 전달을 추적한다.
- [x] 격리된 PostgreSQL 호환 검증 환경에 과거 DDL과 동일한 audit 컬럼을 가진 최소 테이블을 만들고 합성 11자 입력의 길이 오류를 확인한다.

## Task 2: 상세 사양과 SQL

**Create (양쪽 동일 사본):**

- `docs/database/20261028/20261028_009_expand_sales_order_audit_columns.sql`
- `docs/database/20261028/20261028_009_rollback_sales_order_audit_columns.sql`
- `docs/database/20261028/20261028_009_change_sales_order_audit_columns.md`
- 위 세 파일을 `backend/DATABASE/20261028`에도 같은 이름·내용으로 생성한다.

**Modify:** `docs/database/db-schema.md`의 수주 audit 계약 및 적용 상태.

- [x] 날짜별 상세 사양서를 작성한다.
- [x] 변경은 다음 DDL로 제한하고 트랜잭션 및 로컬 lock timeout을 적용한다.

```sql
ALTER TABLE public.tb_sales_order_hd
    ALTER COLUMN created_by TYPE VARCHAR(100),
    ALTER COLUMN updated_by TYPE VARCHAR(100);
```

- [x] 롤백은 같은 트랜잭션에서 테이블 쓰기를 잠그고 두 컬럼에 10자 초과 값이 있으면 예외로 중단한다. 절삭 cast나 데이터 변경은 금지한다.
- [x] 누적 스키마에는 관찰한 실제 10자 상태와 변경 후 100자 목표를 구분한다.

## Task 3: 검증과 결과

- [x] 합성 10/11/100자 입력 및 수정값 보존, 101자 거부, 변경 SQL 재실행, NULL 유지, 긴 audit 값 존재 시 롤백 거부, 짧은 값만 남은 경우 롤백 성공을 검증한다.
- [x] 양쪽 SQL/이력 사본을 바이트 단위로 비교한다.
- [x] `backend`에서 `mvn -q "-Dtest=SalesOrderServiceImplTest,SalesOrderApiControllerTest,SalesOrderTenantScopeMapperTest" test`를 실행한다.
- [x] `docs/result/20261028/sales-order-audit-length`에 원인·근거·검증 결과·실제 DB 미적용 및 적용 절차를 기록한다.
- [x] UI·API 동작 및 DB 데이터는 변경하지 않는다. 실제 DB 저장 검증은 적용 후 별도 확인이 필요하다.
