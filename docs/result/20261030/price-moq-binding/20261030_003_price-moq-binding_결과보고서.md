# 단가 저장 MOQ 숫자 바인딩 오류 수정 결과

## 재현 조건과 원인

- 최소주문수량을 비워 단가를 저장하면 PostgreSQL의 numeric/VARCHAR 타입 충돌로 INSERT가 실패했다.
- `ItemPartnerPriceSaveRequestVO.moq`와 서비스 파라미터는 올바르게 `BigDecimal`/null을 사용하고 있었다.
- 전역 `mapper-config.xml`의 `jdbcTypeForNull=VARCHAR` 설정과 단가 매퍼의 JDBC 타입 미지정 조합으로 빈 MOQ가 `setNull(index, Types.VARCHAR)`로 전달됐다. UPDATE에도 같은 문제가 있었다.
- 수정 전 실제 설정/매퍼/`DefaultParameterHandler`를 실행한 테스트에서 NULL INSERT/UPDATE 2건이 `Types.NUMERIC` 기대값과 다른 `Types.VARCHAR` 호출로 실패했다. 기존 숫자 0/소수 바인딩 2건은 통과했다.

## 해결

- 단가 매퍼 INSERT/UPDATE의 MOQ 파라미터 두 곳에 `jdbcType=NUMERIC`을 명시했다.
- 빈 MOQ는 숫자 타입 SQL NULL, 0/12.50은 기존 BigDecimal로 전달된다.
- 전역 NULL 설정, API/VO/서비스, 중복 및 tenant 검증, 배치 트랜잭션은 변경하지 않았다.

## MCP 근거와 DB 변경

- 기본 `s-erp-postgresql-readonly`의 `list_tables(public)` → `describe_table(tb_item_partner_price)`를 직접 호출했다.
- 현재 테이블의 `moq`는 NULL 허용 numeric, `unit_price`는 NOT NULL numeric임을 확인했다.
- 업무 행, tenant 데이터, 계정/인증 정보는 조회하거나 기록하지 않았다.
- DDL/DML 실행, 데이터 마이그레이션, 스키마 변경이 없으므로 날짜별 SQL/롤백/누적 스키마 변경 대상이 아니다.

## 검증

- 단가 매퍼/서비스/배치/API: 14건 통과.
- 전체 `mvn -q test`: 103개 suite, 총 683건 중 681건 통과, 2건 skip, 실패/오류 0건.
- `ItemPartnerPriceMapperTest`: 실제 운영 MyBatis 설정과 매퍼를 로드하여 JDBC 호출을 검증한다. INSERT/UPDATE의 NULL MOQ 및 0/소수 입력을 포함한다.
- 실제 PostgreSQL 저장 요청은 실행하지 않았다. 운영 데이터 쓰기 없이 JDBC 타입 오류 경로를 회귀 검증했다.
- 프론트엔드 저장 계약이나 화면을 변경하지 않아 별도 UI 스크린샷은 생성하지 않았다. 동일 단가 폼의 [앞선 결과와 3개 뷰포트 스크린샷](../price-master-picker/20261030_002_price-master-picker_결과보고서.md)을 참조한다.

## 적용 및 최종 점검

- 변경된 Mapper XML을 포함한 backend를 재시작/재배포해야 기존 실행 프로세스에 반영된다. 기존 서버는 임의로 종료/재시작하지 않았다.
- 작업지시서 → 계획서 → 상세사양서 → 실패 테스트 → 최소 수정 → 검증/결과 순서를 적용했다.
- 도움창 수정과 무관한 기존 전자결재 현황 변경사항은 보존했다.
