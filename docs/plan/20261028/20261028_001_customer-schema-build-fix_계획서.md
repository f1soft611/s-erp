# Customer Schema Build Fix Implementation Plan

**Goal:** 거래처 분류 필드의 OpenAPI 메타데이터 누락으로 인한 Maven 실패를 해결한다.

**Architecture:** 기존 VO의 필드와 JSON 계약은 유지한다. 공개 분류 필드에는 설명을 추가하고 내부 전송 여부 플래그에는 설명과 숨김 속성을 추가한다. 테스트의 전체 필드 설명 검증은 유지한다.

**Tech Stack:** Java, Swagger/OpenAPI, Jackson, JUnit 5, Maven.

## 근거

- [작업지시서](../../directions/20261028/20261028_001_customer-schema-build-fix_작업지시서.md)
- 기존 `CustomerInfoSchemaTest` 실행에서 사용자 보고와 동일한 실패 3건을 확인했다.
- DB MCP `list_tables` → `describe_table(tb_customer_info)`로 기존 분류 ID 컬럼의 nullable bigint 계약을 확인했다. 데이터 행은 조회하지 않았다.

## 실행 순서

- [x] `backend/src/test/java/egovframework/let/co/master/customer/domain/model/CustomerInfoSchemaTest.java`에서 생성된 OpenAPI에 응답 분류 4필드의 설명이 존재하고 저장 요청 및 상속 변경 요청에 내부 플래그가 없는지 검증한다.
  - 응답 속성: `businessKind1`, `businessKind2`, `businessKind1Name`, `businessKind2Name`.
  - 요청에서 제외할 속성: `businessKind1Provided`, `businessKind2Provided`.
- [x] `mvn -B "-Dtest=CustomerInfoSchemaTest" test`로 실패를 확인한다.
- [x] `backend/src/main/java/egovframework/let/co/master/customer/domain/model/CustomerInfoVO.java`의 위 4필드에 `@Schema(description = "거래처 대분류 ID")` 형식의 각 필드에 맞는 설명을 추가한다.
- [x] 같은 디렉터리의 `CustomerInfoSaveRequestVO.java`의 2개 플래그에 `@Schema(description = "거래처 대분류 ID 전송 여부. 서버 내부 상태", hidden = true)` 형식의 설명을 추가하고 `@JsonIgnore`를 유지한다.
- [x] `mvn -B "-Dtest=CustomerInfoSchemaTest,CustomerInfoServiceImplTest,CustomerInfoBatchServiceImplTest,CustomerInfoApiControllerTest" test`로 메타데이터와 저장 동작을 확인한다.
- [x] `mvn -B package`로 전체 테스트와 WAR 패키징을 확인한다.
- [x] `docs/result/20261028/customer-schema-build-fix`에 재현·원인·수정·검증 결과를 기록한다. UI 변경이 없어 화면 캡처는 적용 대상이 아니다.

자동 커밋 및 DB 변경은 하지 않는다.
