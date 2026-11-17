# 입고 상세 매입마감 컬럼 변경 이력

- 변경일: 2026-11-17
- 대상 테이블: `tb_material_receipt_dt`
- 변경 항목:
  - 컬럼 9개 추가(모두 NULL 허용): `closing_month`(varchar 6, `YYYYMM`), `closed_at`, `closed_by`, `closing_unit_price`, `closing_tax_type`, `closing_vat_included_at`, `closing_supply_amt`, `closing_vat_amt`, `closing_total_amt`.
  - CHECK 4개: 마감월 형식(`YYYYMM`, 월 01~12), 세금 구분(`TAXABLE`/`ZERO_RATED`/`EXEMPT`), 포함 여부(`Y`/`N`), 마감월이 있으면 마감일시·단가·세금 구분·포함 여부·금액 3종이 모두 있어야 함.
  - 인덱스 `ix_material_receipt_dt_closing_month (tenant_id, closing_month)`.
- 설계 결정(2026-11-17 사용자 확정): 마감 정보는 입고 행 컬럼으로 두고 별도 마감 테이블·해제 이력 테이블은 만들지 않는다. 마감 단가는 마감 시 조정할 수 있어 입고 단가(`unit_price`)와 별도로 저장한다. 해제하면 아홉 컬럼을 모두 NULL로 되돌린다.
- 영향 범위: 기존 입고 행은 모두 미마감(NULL). 입고·가입고·검사 동작은 DB 변경만으로는 바뀌지 않고, 백엔드가 마감 행의 입고 수정·행 빼기·취소를 막는다. 단가 마스터(`tb_item_partner_price`)에는 부가세 컬럼이 없어 이번에 변경하지 않는다(후속).
- MCP 확인(2026-11-17): `describe_table`로 `tb_material_receipt_dt`에 위 컬럼이 없고 `unit_price`·`supply_amt`·`vat_amt`·`total_amt`가 있음, `tb_material_receipt_hd`에 `tax_type`·`vat_included_at`·`use_at`이 있음을 확인했다.
- 적용 상태: 사용자가 2026-11-17 실행했고 MCP로 컬럼·제약·인덱스(메뉴는 메뉴·메뉴 권한 3건·역할 권한 6건)가 스크립트와 일치함을 확인했다.
- 롤백 여부: 제공함. 인덱스·제약·컬럼을 삭제하며 마감 정보는 함께 사라진다. 입고 데이터는 삭제하지 않는다.

- 번호 안내(2026-11-17): 같은 날짜 폴더에 영업관리 쪽 `20261117_006`(견적 공통코드)~`20261117_010`(소수점 정책) 스크립트가 있어 이 변경의 번호 `007`과 겹친다. 두 계열은 서로 다른 작업이고 파일명이 달라 덮어쓰이지 않으며 서로 의존하지 않는다. 이미 적용한 뒤에 확인되어 번호는 바꾸지 않았다. 구매자재 쪽 적용 순서는 001 → 008, 영업 쪽은 별도로 006 → 010이다.

적용 SQL: `20261117_007_add_receipt_closing_columns.sql`

롤백 SQL: `20261117_007_rollback_receipt_closing_columns.sql`
