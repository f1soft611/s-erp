# 단가 MOQ 숫자 바인딩 상세사양서

## 근거

- [작업지시서](../../directions/20261030/20261030_003_price-moq-binding_작업지시서.md)
- [계획서](../../plan/20261030/20261030_003_price-moq-binding_계획서.md)
- 2026-10-30 기본 `s-erp-postgresql-readonly` MCP의 `list_tables(public)` 및 `describe_table(tb_item_partner_price)` 직접 호출: 테이블이 존재하고 `moq`는 NULL 허용 numeric, `unit_price`는 NOT NULL numeric이다. 업무 행은 조회하지 않았다.

## 원인

- 요청 VO의 `moq`는 `BigDecimal`이고 서비스는 미입력 시 Map에 null을 넣는다.
- 현재 전역 MyBatis 설정의 `jdbcTypeForNull`은 `VARCHAR`이다.
- 단가 매퍼가 `#{moq}`에 JDBC 타입을 지정하지 않아 비어 있는 MOQ가 `setNull(index, Types.VARCHAR)`로 전달된다.
- PostgreSQL은 해당 typed NULL을 numeric 컬럼에 직접 넣을 수 없어 INSERT가 실패한다. UPDATE도 같은 패턴이다.

## 수정

```xml
#{moq,jdbcType=NUMERIC}
```

- 신규 및 수정 저장에 동일하게 적용한다.
- 미입력 MOQ는 `Types.NUMERIC`의 SQL NULL로, 입력된 0/양수/소수는 기존 `BigDecimal` 숫자로 바인딩한다.
- 전역 NULL 설정, 단가/기간/중복/tenant 검증과 배치 트랜잭션은 그대로 유지한다.
- DB 스키마 변경, 데이터 마이그레이션, SQL 이력 추가는 불필요하다.

## 검증 기준

- 실제 전역 설정/매퍼를 로드하고 파라미터 핸들러가 INSERT/UPDATE에서 NULL에 `setNull(..., Types.NUMERIC)`를 호출한다.
- 0과 12.50은 INSERT/UPDATE 모두 `setBigDecimal`로 전달된다.
- 단가 서비스, 배치 저장 롤백, API 기존 테스트가 통과한다.
- 운영 DB 쓰기나 기존 서버 재시작을 하지 않으며 적용에는 수정된 backend 리소스를 배포/재시작해야 한다.
