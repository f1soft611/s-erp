# 20261123_001 단가등록 매입/매출 화면 분리 상세사양서

근거: [작업지시서](../../directions/20261123/20261123_001_item-price-trade-split_작업지시서.md), [계획서](../../plan/20261123/20261123_001_item-price-trade-split_계획서.md)

## 1. 메뉴·화면

| 항목 | 매입단가등록 | 매출단가등록 |
| --- | --- | --- |
| 메뉴 | 기존 ID 29 이름 변경 | 신규(테넌트별) |
| 메뉴 코드 | `CO_UPRICE`(유지) | `CO_UPRICE_SALES` |
| 주소 | `/co/master/item-purchase-prices` | `/co/master/item-sales-prices` |
| 화면 키(주소 마지막 마디) | `item-purchase-prices` | `item-sales-prices` |
| 거래구분 | 매입 | 매출 |
| 정렬 | 50 | 51 |
| 위치 | 기준정보 > 마스터(부모 13) | 같음 |

- 기존 화면 키 `item-partner-prices`는 제거한다(북마크·리다이렉트 없음).
- 설명 문구(대시보드 `dashboardData.ts`): 매입 "품목과 거래처별 매입 단가와 적용기간을 관리하고 엑셀로 등록합니다. 거래처를 비우면 모든 거래처에 적용되는 품목 공통단가입니다. 품목마다 매입 기본 거래처를 지정합니다." / 매출 "…매출 단가…" (기본 거래처 문구 없음).

## 2. 권한 검사 (백엔드)

### 2.1 `ItemPriceAccessService`
- 위치: `itempartnerprice/service`(인터페이스)·`service/impl`. `SystemMenuService.getMyMenuTree(tenantId, userId, roleId, roleCode)`로 내 메뉴 트리를 읽고, 모듈 경로 첫 마디가 `co`인 모듈 아래에서 화면 키(경로 마지막 마디)가 거래구분의 키인 노드의 권한을 확인한다(분류관리 컨트롤러와 같은 방식).
- 메서드: `requirePermission(LoginVO user, String tradeType, Operation op)` → 허용이면 테넌트 ID 반환, 인증 없으면 401, 권한 없으면 403(`ResponseCode.AUTH_ERROR` 메시지).
- 거래구분→화면 키: 매입→`item-purchase-prices`, 매출→`item-sales-prices`. 그 외 값은 400.
- 권한 매핑: READ=read·create·update 중 하나, CREATE=create, UPDATE=update, DELETE=delete(분류관리와 같이 READ는 쓰기 권한도 허용).

### 2.2 엔드포인트별 적용
| 엔드포인트 | 거래구분 출처 | 필요 권한 |
| --- | --- | --- |
| `GET /overview` | `tradeType` 파라미터(필수) | READ |
| `GET /customer-overview` | `tradeType`(필수) | READ |
| `GET /`(목록) | `tradeType`(필수) | READ |
| `POST /validate-import` | 모든 행의 `tradeType`(비어 있거나 매입/매출이 아니면 400) | 행에 나온 거래구분별 CREATE |
| `POST /save-batch` | 신규 행: 요청 값, 수정 행: 요청 값과 DB의 기존 행 거래구분 둘 다, 삭제 행: DB의 기존 행 거래구분 | 신규=CREATE, 수정=UPDATE, 삭제=DELETE (거래구분별) |

- 저장은 검사를 모두 통과한 뒤에만 시작한다(일부만 반영하지 않는다). 수정 행의 요청 거래구분과 기존 행 거래구분이 다르면 400("거래구분은 바꿀 수 없습니다"는 기존 서비스 규칙과 같은 방향; 서비스가 이미 거부하면 그대로 두고 권한 검사만 두 값을 모두 본다).
- 삭제·수정 행의 기존 거래구분은 `ItemDefaultSupplierService.findMaterialIdsByPriceIds`와 같은 방식으로 DAO에서 한 번에 조회한다(신규 쿼리 `selectTradeTypesByPriceIds`).
- `ItemPriceLookupService`·구매요청확정 등 내부 서비스 호출에는 메뉴 권한 검사를 걸지 않는다(구매 화면의 단가 조회는 단가 메뉴 권한과 무관).

## 3. 조회 API 변경

### 3.1 `GET /overview?tradeType=매입|매출&keyword=&priceFilter=&effectiveOn=`
- 응답 행 구조는 유지한다. `tradeType` 쪽 객체(`purchase` 또는 `sales`)만 채우고 다른 쪽은 항상 null.
- `priceFilter` 값: `ALL`, `NO_COMMON_PRICE`(그 구분의 공통단가가 없는 품목), `HAS_SPECIAL`(그 구분의 거래처 단가가 있는 품목), `NO_DEFAULT_SUPPLIER`(매입일 때만, 기본 거래처가 없는 품목). 매출에 `NO_DEFAULT_SUPPLIER`를 보내면 400. 기존 `NO_PURCHASE`/`NO_SALES`는 제거한다.
- 특별단가 건수·자식 행은 그 구분의 거래처 단가만 센다. 그 구분 단가가 없는 거래처 자식 행은 만들지 않는다.
- 부모 행의 기본 거래처(`defaultSupplier*`)는 매입일 때만 채운다.

### 3.2 `GET /customer-overview?tradeType=…`
- 거래처별 `priceCount`와 등록 여부 필터(`registerFilter`)를 그 구분 기준으로 센다.

### 3.3 `GET /?tradeType=…`(목록)
- `tradeType`을 필수로 바꾼다(기존에도 선택 필터로 존재). 그 외 필터(`customerId`, `includeHistory`, `useAt`, `keyword`)는 유지.

## 4. 프론트엔드

### 4.1 구조
- `ItemPartnerPriceManagementPage`가 `tradeType: '매입' | '매출'`을 받는다. 하위 `ItemPriceOverviewPage`, `ItemPriceByCustomerPage`, `ItemPartnerPriceListPage`, 훅·서비스에 전달한다. 서비스는 위 조회에 `tradeType`을 보낸다.
- 탭은 기존 3개(품목 기준 / 거래처 기준 / 단가 이력 조회) 그대로. 화면 제목은 메뉴 이름을 쓴다(breadcrumb 기존 방식).
- `DashboardContent`: `currentPageKey`가 `item-purchase-prices`이면 매입, `item-sales-prices`이면 매출을 넘긴다.

### 4.2 품목 기준(F1Tree)
- 열: No, 품목, (거래처 선택), 규격, 단위, 특별단가, [매입만: 매입 기본 거래처], 선택 구분의 단가 열(원화단가·부가세구분·부가세포함·외화단가·통화·[매입만: 발주구분]·적용일). 다른 구분의 열은 만들지 않는다.
- 기본 거래처 체크박스·발주구분은 행 폼의 "품목" 그룹/단가 그룹 배치를 지난 작업(20261120_009)과 같게 유지하되 매입에서만 만든다.
- 행 폼 그룹 이름: "매입 단가" 또는 "매출 단가" 하나만 표시.
- 변경 집합(`buildItemPriceBatch`, `buildItemPriceRemoveBatch`)은 선택 구분 한쪽만 처리한다.
- 삭제 확인 창(`ItemPriceRemoveDialog`)은 구분 선택 없이 현재 구분의 단가를 삭제/미사용 처리한다.
- `storageKey`: 매입·매출을 분리해 `co-master-item-price-overview-purchase-v1`, `…-sales-v1`.

### 4.3 거래처 기준 · 이력 조회(F1Grid)
- 거래구분 컬럼은 숨기고 신규 행의 거래구분을 화면 구분으로 고정한다. 행 폼의 "거래구분" 칸도 숨긴다.
- 발주구분·기본 거래처 열/폼 칸은 매입 화면에서만 만든다.
- 검색 필드에서 "거래구분"을 제거한다. 단가 상태 필터는 3.1 값 중 구분에 해당하는 옵션만 보인다: 전체 / 공통단가 미등록 / 특별단가 있는 품목 / [매입만] 매입 기본 거래처 미지정.
- `storageKey`: 구분별로 분리(`…-purchase-…`, `…-sales-…`).

### 4.4 엑셀
- 거래처별 단가 양식: 매입은 14열(발주구분·기본거래처 포함), 매출은 12열. 거래구분 열은 두고 값이 화면 구분과 다르면 행 오류("이 화면은 매입(또는 매출) 단가만 등록할 수 있습니다").
- 품목 기준 엑셀 양식·읽기도 선택 구분 한쪽 열만 쓴다.
- 서버 `validate-import`는 행 거래구분별 CREATE 권한을 검사한다.

## 5. 메뉴 SQL (사용자가 실행)

`docs/database/20261123/20261123_001_split_item_price_menu.sql`(+ 롤백, 변경 이력 md)와 `backend/DATABASE` 동일 복사.

1. 기존 메뉴(`menu_code = 'CO_UPRICE'`, 모든 테넌트) 이름을 "매입단가등록", 주소를 `/co/master/item-purchase-prices`로 변경, `menu_dc` 갱신.
2. 테넌트마다 "매출단가등록" 행 추가: `menu_id`는 `MAX(menu_id) + 순번`, `menu_code='CO_UPRICE_SALES'`, 부모·모듈·아이콘은 기존 행 복사, 정렬 51, 주소 `/co/master/item-sales-prices`. 이미 있으면 건너뛴다(재실행 가능).
3. 기존 메뉴의 `tb_role_menu_permission`을 새 메뉴로 복제(역할·권한 ID 동일). 이미 있으면 건너뛴다.
4. 롤백: 새 메뉴의 권한·메뉴 행 삭제(기존 메뉴 이름·주소를 원래대로). 롤백 전 새 메뉴에 사용자 즐겨찾기가 있으면 중단하도록 가드한다.
- 검증(MCP): 메뉴 2건, 역할 권한 5+5건, 이름·주소 확인.

## 6. 검증 기준

- 백엔드: 권한 서비스 단위 테스트(메뉴에 키 없음/read만/create만/delete만, 매입 권한만으로 매출 거부 등), 컨트롤러가 거래구분 파라미터 누락 400·권한 없음 403, 저장 시 삭제·수정 행 거래구분 조회 후 검사, 일부 거부 시 저장 호출 없음, 조회 쿼리 매퍼 테스트.
- 프론트: 매입/매출 각각 열·폼·필터 옵션·엑셀 열, 변경 집합이 한쪽만 생성, 서비스가 `tradeType`을 보냄, 매출 화면에 발주구분·기본 거래처 없음.
- 브라우저(합성 API, 375/768/1280px): 두 메뉴 화면과 행 폼.
- JDK 8 컴파일, 프론트 빌드.

## 7. 가정
- 메뉴 권한은 `tb_role_menu_permission`(메뉴×역할×권한)이며 현재 데이터는 테넌트 1, 역할 1(5개 권한)뿐이다(2026-11-23 MCP 확인).
- 단가 테이블 구조·`ItemPriceLookupService`·구매요청확정은 변경하지 않는다.
- 기존 주소 호환은 개발 단계라 제공하지 않는다.
