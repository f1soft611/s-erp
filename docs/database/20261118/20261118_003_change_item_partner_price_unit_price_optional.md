# 20261118_003 단가 원화단가 필수 해제 변경 이력

- 일자: 2026-11-18
- 대상 테이블: `tb_item_partner_price`
- 문서: [작업지시서](../../directions/20261118/20261118_010_구매단가참조_부가세통화연동_작업지시서.md), [상세사양서](../../spec/20261118/20261118_010_구매단가참조_부가세통화연동_상세사양서.md)

## 변경 내용
| 구분 | 내용 |
| --- | --- |
| `unit_price` | NOT NULL 해제. 외화단가만 관리하는 단가 허용 |
| CHECK | `ck_tb_item_partner_price_any_price`: `unit_price IS NOT NULL OR foreign_unit_price IS NOT NULL` |

## 영향 범위
- 단가등록 저장·엑셀 검증, 품목 기준·거래처 기준 조회, 구매 단가 조회(외화단가만 있으면 외화통화+외화단가를 기본 설정).
- 기존 행은 모두 원화단가가 있어 데이터 변경 없음.

## 롤백
- [롤백 스크립트](20261118_003_rollback_item_partner_price_unit_price_optional.sql). 원화단가가 NULL인 행이 있으면 오류로 중단한다(먼저 정리 필요).
