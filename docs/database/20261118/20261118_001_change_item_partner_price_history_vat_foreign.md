# 20261118_001 단가등록 기본단가·부가세·외화단가 변경 이력

- 일자: 2026-11-18
- 대상 테이블: `tb_item_partner_price`
- 문서: [작업지시서](../../directions/20261118/20261118_007_단가등록_이력부가세외화_작업지시서.md), [상세사양서](../../spec/20261118/20261118_007_단가등록_이력부가세외화_상세사양서.md)

## 변경 내용
| 구분 | 내용 |
| --- | --- |
| `customer_id` | NOT NULL 해제. NULL = 품목 기본단가 |
| `tax_type` | 신규 varchar(30) NOT NULL 기본 `TAXABLE` (공통코드 `PURCHASE_TAX_TYPE`) |
| `vat_included_at` | 신규 char(1) NOT NULL 기본 `N`, CHECK Y/N |
| `foreign_unit_price` | 신규 numeric(15,2) NULL, CHECK ≥ 0 |
| `currency` | NOT NULL·기본값 해제. 기존 `KRW`는 NULL로 정리 |
| 인덱스 | `uq_tb_item_partner_price_default_key` (customer_id IS NULL 부분 유니크) |

## 영향 범위
- 단가등록 화면·API(`/api/v1/co/master/item-partner-prices`), 구매확정 단가 조회(`selectDefaultUnitPrice`).
- 확인 시점(2026-11-18) 데이터: `KRW` 5건, `USD` 1건. `USD` 행은 기존 단가를 `foreign_unit_price`로 복사하고 `unit_price`(원화단가)는 그대로 두므로 적용 후 원화단가를 검토해야 한다.
- 기존 행은 거래처가 모두 지정되어 있어 데이터 이동 없음. 기존 `KRW` 통화는 NULL이 되며 구매확정 조회 서비스가 빈 통화를 `KRW`로 보정한다.

## 롤백
- [롤백 스크립트](20261118_001_rollback_item_partner_price_history_vat_foreign.sql). 기본단가 행은 삭제되고 외화단가·부가세 값은 사라지므로 실행 전 백업이 필요하다.
