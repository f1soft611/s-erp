# 20261123_001 단가등록 메뉴 분리 이력

- 날짜: 2026-11-23
- 작업: 단가등록을 매입단가등록 / 매출단가등록 두 메뉴로 분리 ([사양서](../../spec/20261123/20261123_001_item-price-trade-split_상세사양서.md))
- 스크립트: `20261123_001_split_item_price_menu.sql` / 롤백 `20261123_001_rollback_split_item_price_menu.sql`
- 선행 확인(읽기 전용 DB, 2026-11-23): 단가 메뉴는 ID 29 한 건(`CO_UPRICE`, 테넌트 1), 즐겨찾기 0건, 역할 1에 READ·CREATE·UPDATE·DELETE·EXCEL 5건.

## 변경 내용
| 대상 | 변경 |
|---|---|
| `tb_menu` (`menu_code='CO_UPRICE'`) | 이름 → 매입단가등록, 주소 → `/co/master/item-purchase-prices`, 설명 갱신 (코드·부모·정렬 그대로) |
| `tb_menu` 신규 | `CO_UPRICE_SALES` 매출단가등록, `/co/master/item-sales-prices`, 부모·모듈·아이콘은 기존 메뉴 복제, 정렬은 기존 + 1 |
| `tb_role_menu_permission` | 기존 메뉴의 역할·권한을 새 메뉴로 복제 |

테이블 구조 변경은 없다(`db-schema.md` 갱신 대상 아님).

## 영향 범위
- 화면 키가 `item-partner-prices`에서 `item-purchase-prices` / `item-sales-prices`로 바뀐다. **화면·API 코드가 먼저 반영된 뒤에 이 SQL을 실행한다.** 코드 반영 전에 실행하면 새 주소의 화면이 열리지 않는다.
- 이전 주소(`/co/master/item-partner-prices`) 북마크는 지원하지 않는다(개발 단계).
- 단가 API는 거래구분별 메뉴 권한(`item-purchase-prices` / `item-sales-prices`)을 검사한다. 이 SQL로 두 메뉴의 권한이 같은 역할에 같은 값으로 생긴다.
- 모든 테넌트의 `CO_UPRICE` 메뉴가 대상이다. 재실행해도 안전하다.

## 롤백
롤백 스크립트가 새 메뉴와 권한을 삭제하고 기존 이름·주소로 되돌린다. 매출단가등록에 즐겨찾기가 있으면 중단한다. 화면 코드도 이전 버전으로 되돌려야 이전 주소가 열린다.
