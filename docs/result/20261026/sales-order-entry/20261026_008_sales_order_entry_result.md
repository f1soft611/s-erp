# 20261026_008 수주등록 페이지 및 DDL 작업 결과

## 결과 요약

- 기존 메뉴 경로 `/sales/order/create`에 수주등록 화면을 연결하고, `영업관리 > 수주관리 > 수주등록` 경로를 표시했다.
- 수주 기본정보, 거래처 선택, F1-Grid 상세 행 추가·삭제, 품목 선택, 공급가·부가세·합계 표시를 구현했다.
- 저장 API가 없어 저장 버튼은 비활성 상태이며, 화면 입력은 현재 페이지의 임시 상태로만 유지된다. 수주 검색 API와 자동 채번도 연결하지 않았다.
- 수주 메인·디테일 테이블 생성 DDL, 롤백, 변경 이력을 `docs/database`와 `backend/DATABASE`에 동일하게 작성했다. 데이터베이스에는 적용하지 않았다.
- 브라우저 검증 중 좁은 화면에서 수주 입력 영역 하단이 잘리는 현상을 발견해 페이지 내부 세로 스크롤을 추가했다. 또한 F1-Grid의 일반 셀 편집 commit이 `onValueChange` 반환 patch를 숫자/통화 편집에 적용하지 않던 경로를 수정해 수주 금액 재계산이 실제 입력에서도 동작하게 했다.

## 구현 산출물

### 데이터베이스 문서

- 생성 DDL: [sales-order schema](../../../database/20261026/20261026_008_create_sales_order_schema.sql)
- 롤백 스크립트: [sales-order rollback](../../../database/20261026/20261026_008_rollback_sales_order_schema.sql)
- 변경 이력: [sales-order schema history](../../../database/20261026/20261026_008_change_sales_order_schema.md)
- 동일 사본은 `backend/DATABASE/20261026`에도 유지한다. 계약 검사는 DDL 사본의 동일성과 테넌트 복합 키·FK, 롤백 보호를 확인한다.

### 화면 및 F1-Grid

- 수주등록 화면: [SalesOrderCreatePage.tsx](../../../../frontend/src/pages/sales/order/create/SalesOrderCreatePage.tsx)
- F1-Grid 상세 편집: [SalesOrderDetailGrid.tsx](../../../../frontend/src/pages/sales/order/create/components/SalesOrderDetailGrid.tsx)
- 상세 행·계산 규칙: [salesOrderDetail.ts](../../../../frontend/src/pages/sales/order/create/data/salesOrderDetail.ts)
- 재사용 거래처·품목 선택기: [master-picker](../../../../frontend/src/shared/components/master-picker)
- 인라인 편집 `onValueChange` 동작 문서: [F1-GRID.md](../../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)

## 브라우저 및 동작 검증

인증된 브라우저에서 `/sales/order/create`를 열어 확인했다.

| 뷰포트 | 결과 |
|---|---|
| 375px | 페이지 가로 넘침 없이 표시되고, 폼 영역 내부에서 세로 스크롤된다. |
| 768px | 페이지 가로 넘침 없이 표시되고, 폼 영역 내부에서 세로 스크롤된다. |
| 1280px | 페이지 가로 넘침 없이 표시되고, 폼 영역 내부에서 세로 스크롤된다. |

- 거래처 선택과 품목 선택 대화상자가 열리고 검색 전 안내 문구가 표시된다.
- F1-Grid에 상세 행을 추가하고 수량 `2`, 단가 `100`을 입력하면 공급가 `200`, 기본 부가세 `20`, 라인 합계 `220`으로 계산된다. 부가세를 `30`으로 수정하면 라인 합계는 `230`으로 바뀐다.
- 저장 버튼은 계속 비활성 상태이며, 저장되었다는 성공 메시지나 서버 저장 처리는 없다.
- 화면 캡처:
  - [375px 화면](./screenshots/sales-order-entry-375px.png)
  - [768px 화면](./screenshots/sales-order-entry-768px.png)
  - [1280px 화면](./screenshots/sales-order-entry-1280px.png)

## 검증 결과

- 프론트엔드 집중 테스트: 6개 파일, 17개 테스트 통과
- 프론트엔드 TypeScript/Vite 빌드: 통과
- 변경된 프론트엔드 파일 lint: 종료 코드 0. 기존 F1-Grid 파일의 다른 구간에서 React effect 및 hook dependency 경고가 출력되었으며, 이번 수정 구간에는 경고가 없다.
- SQL 계약 검사: 4개 테스트 통과
- `git diff --check`: 공백 오류 없이 종료. 기존 `frontend/src/App.tsx`의 줄바꿈 형식 알림만 출력되었으며 해당 파일은 이번 수주등록 작업에서 수정하지 않았다.

주요 회귀 테스트:

- [sales-order-create-page.test.tsx](../../../../frontend/tests/sales-order-create-page.test.tsx): F1-Grid 편집 후 공급가·부가세·합계 재계산 및 수동 부가세 변경
- [sales-order-scroll.test.tsx](../../../../frontend/tests/sales-order-scroll.test.tsx): 대시보드 뷰포트 안에서 수주 입력 영역의 세로 스크롤
- [test_sales_order_schema.cjs](../../../../tools/tests/test_sales_order_schema.cjs): DDL 사본, 키/FK 계약, 롤백 보호

## 범위 및 미완료 연동

- 생성 DDL은 문서 산출물이며 DB에 실행하지 않았다.
- 수주 저장·검색 API, 수주번호 채번, 메뉴 데이터 변경은 이번 범위에 포함하지 않았다.
- 마스터 선택기는 기존 거래처·품목 조회 서비스를 연결하지만, 이 결과 문서에는 업무 데이터 행이나 개인정보를 기록하지 않는다.
