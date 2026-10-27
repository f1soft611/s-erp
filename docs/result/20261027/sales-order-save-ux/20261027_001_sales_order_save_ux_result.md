# 20261027_001 수주등록 저장 API 및 사용성 개선 결과

## 구현 내용

- 기존 eGovFrame 계층 패턴으로 `POST /api/v1/sales/orders`를 추가했다.
- 백엔드 소스와 테스트를 `egovframework.let.sales.order.create` 패키지 및
  대응 물리 경로에 두고, MyBatis XML도 `mapper/let/sales/order/create`에
  배치해 프론트엔드 `sales/order/create` 기능 경로와 대응시켰다.
  거래처/품목 tenant 검증, `IdSequenceService` 채번, 서버 금액 계산,
  헤더·상세 단일 트랜잭션 저장을 적용했다.
- API 컨트롤러를 시스템 패턴으로 정리해 `@Operation`, `@ApiResponses`,
  `@SecurityRequirement`, `@ResponseStatus(CREATED)`와 공통 `ResultVO`
  응답을 사용한다. 요청/응답 VO에는 필드별 OpenAPI `@Schema`와 클래스
  JavaDoc을 추가했다.
- 수주등록 화면에 입력 검증, API 저장, 저장 중 중복 제출 방지,
  오류 시 입력 보존, 성공 수주번호 안내를 연결했다. 수주번호는
  저장 시 자동 생성됨을 화면에 표시한다.
- 미저장 상태에서 앱 내 이동은 React Router Data Router의 `useBlocker`로
  확인하고, 브라우저 이탈은 `beforeunload`로 경고한다. 저장 성공 뒤에는
  경고가 해제되고 화면 입력은 보존된다.
- 상세 그리드 옆에 선택 행용 `품목 선택` 버튼을 배치했다. 공통 도움창에서
  선택한 품목 ID·코드·명을 같은 행에 반영하며 기존 코드 셀 도움 기능도
  유지한다.
- 375px/768px/1280px 브라우저 확인에서 페이지 수평 overflow가 없고,
  상세 그리드의 가로 overflow는 그리드 내부 스크롤로 제한됨을 확인했다.

## 검증

- Backend: `SalesOrderApiControllerTest`, `SalesOrderServiceImplTest`,
  `SalesOrderTenantScopeMapperTest` 등 집중 테스트 10개 통과.
- Frontend: 수주 페이지 10개, API 서비스 4개, 라우팅 회귀 3개 테스트 통과.
- Frontend production build 통과.
- 변경된 프론트엔드 파일의 Oxlint 검사는 통과했다. 전체 `npm run lint`는
  기존 `tests/common-code-management-page.test.tsx:53`의 조건부
  `useImperativeHandle` 규칙 위반으로 실패해 해당 무관 테스트는 수정하지 않았다.
- Playwright 브라우저 검증: 375px, 768px, 1280px 모두 document/body 너비가
  viewport 너비와 같았고, 브라우저 오류가 없었다. API 응답은 브라우저
  확인용 mock을 사용했다.

## DB 제약

사용자가 수주 테이블을 생성했다. 최신 읽기 전용 MCP 목록에서
`tb_sales_order_hd`/`tb_sales_order_dt`를 확인하고 Mapper가 사용하는 주요
컬럼 메타데이터를 대조했다. 행 데이터는 조회하지 않았으며, 이 작업에서는
DDL 실행, DB 쓰기 또는 실제 DB 저장 통합 검증을 수행하지 않았다.

## 브라우저 캡처

- 375px 기본 화면: [sales-order-entry-375.png](screenshots/sales-order-entry-375.png)
- 375px 상세 입력 영역: [sales-order-entry-375-detail.png](screenshots/sales-order-entry-375-detail.png)
- 768px: [sales-order-entry-768.png](screenshots/sales-order-entry-768.png)
- 1280px: [sales-order-entry-1280.png](screenshots/sales-order-entry-1280.png)

## 회귀 수정: 저장 시 date 형변환 오류

- 재현: 수주 저장 시 `PSQLException: 열 "delivery_dt"은(는) date 자료형인데 표현식은 character varying 자료형입니다`.
- 원인: 읽기 전용 MCP `describe_table` 확인 결과 `tb_sales_order_hd.order_dt`,
  `tb_sales_order_hd.delivery_dt`, `tb_sales_order_dt.delivery_dt`가 `date`인데,
  Mapper가 값을 형변환 없이 바인딩해 varchar로 전달되었다.
- 해결: 기존 Mapper 패턴(`CAST(#{...} AS date)`)에 맞춰 세 날짜 바인딩을 형변환했다.
- 회귀 검증: `SalesOrderTenantScopeMapperTest.dateColumnsCastStringParametersToPostgresDate`
  추가(수정 전 실패 확인, 수정 후 `SalesOrder*` 테스트 전체 통과).

## 추가 개선: 필수값 표시 및 F1-Grid 검증

- 상단: `수주일자`, `거래처` 필수 표시. 공통 `MasterPicker`에 선택형
  `required`/`error`/`helperText` prop을 추가해 거래처 미선택 시 필드 아래 오류를
  표시한다(기존 사용처는 prop 생략 시 동작 동일).
- 상세 그리드: `품목코드`, `주문수량`, `단가` 컬럼 `required: true`로 헤더 `*` 표시.
  주문수량은 컬럼 `validate`로 0 초과를 검증한다.
- 저장 시 `gridRef.validate()`를 호출해 오류 셀을 강조하고 저장 요청을 보내지 않는다.
  검증 실패 후 셀이 변경되면 재검증해 해결된 셀 강조를 해제한다.
- F1-Grid 코어 변경 없음(기존 `required`/`validate`/`validate()` 계약 사용).
- 회귀 수정: `sales-order-scroll.test.tsx`가 `useBlocker`용 Data Router 없이
  렌더링해 실패하던 문제를 `createMemoryRouter`로 감싸 해결.
- 검증: `tests/sales-order*`, `tests/master-picker*` 33개 통과, frontend build 통과,
  변경 파일 oxlint 통과. Playwright(`scripts/capture-sales-order-required.js`, API mock)
  375/768/1280px에서 수평 overflow 없음, 저장 요청 0건, 런타임 오류 0건.
- 캡처:
  - [sales-order-required-1280.png](screenshots/sales-order-required-1280.png)
  - [sales-order-validation-1280.png](screenshots/sales-order-validation-1280.png)
  - [sales-order-validation-768.png](screenshots/sales-order-validation-768.png)
  - [sales-order-validation-375.png](screenshots/sales-order-validation-375.png)
