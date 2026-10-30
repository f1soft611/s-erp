# 단가 MOQ 바인딩 수정 Implementation Plan

> **For agentic workers:** 이 세션에서 직접 순서대로 실행한다. 기존 변경을 보존하고 요청되지 않은 커밋/운영 DB 쓰기는 하지 않는다.

**Goal:** MOQ를 비운 단가 신규/수정 저장에서 numeric/VARCHAR 타입 충돌을 제거한다.

**Architecture:** 서비스는 `BigDecimal` 또는 null을 전달하지만 전역 `jdbcTypeForNull=VARCHAR`가 타입 미지정 NULL을 문자열로 바인딩한다. 대상 매퍼의 INSERT/UPDATE `moq`에 `jdbcType=NUMERIC`만 추가해 전역/다른 필드의 동작을 유지한다.

**Tech Stack:** Java, MyBatis, PostgreSQL, JUnit 5, Mockito, Maven.

## 파일과 실행 순서

- [x] DB MCP `list_tables` → `describe_table(tb_item_partner_price)`로 `moq numeric NULL 허용`을 확인한다.
- [x] `backend/src/test/java/egovframework/let/co/master/itempartnerprice/mapper/ItemPartnerPriceMapperTest.java`를 추가한다. 실제 `mapper-config.xml`과 단가 매퍼를 읽고 INSERT/UPDATE의 `DefaultParameterHandler`를 실행해 `PreparedStatement.setNull(index, Types.NUMERIC)` 호출을 검증한다. 입력값 0/12.50은 `setBigDecimal`인지 확인한다.
- [x] `cd backend; mvn -q "-Dtest=ItemPartnerPriceMapperTest" test`로 NULL 바인딩이 VARCHAR여서 실패하는 것을 확인한다.
- [x] `backend/src/main/resources/egovframework/mapper/let/co/master/itempartnerprice/ItemPartnerPrice_SQL_postgresql.xml`의 두 `#{moq}`를 `#{moq,jdbcType=NUMERIC}`로 변경한다.
- [x] `mvn -q "-Dtest=ItemPartnerPriceMapperTest,ItemPartnerPriceServiceImplTest,ItemPartnerPriceBatchServiceImplTest,ItemPartnerPriceApiControllerTest" test`로 매퍼/서비스/트랜잭션/API를 확인한다.
- [x] `mvn -q test`로 백엔드 회귀를 확인한다. 실패 0건, 오류 0건, 기존 skip 2건.
- [x] `docs/result/20261030/price-moq-binding/`에 원인, MCP 근거, 검증과 실제 DB 쓰기 미실행을 기록한다. 앞선 UI 스크린샷을 연결한다.

## 자체 검토

- DDL/DML 직접 실행, API 필드나 업무 규칙 변경은 필요 없다.
- OPTIONAL MOQ null과 숫자 0/소수의 차이를 유지한다.
- SQL 문자열 형태만 확인하지 않고 JDBC 호출까지 검증한다.
