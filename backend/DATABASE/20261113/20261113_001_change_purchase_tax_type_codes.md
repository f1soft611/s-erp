# 구매자재 공통코드(부가세구분) 등록 변경 이력

- 변경일: 2026-11-13
- 대상 테이블: `public.tb_common_code_group`, `public.tb_common_code_item`
- 대상 테넌트: `1` (스크립트에 고정)
- 변경 항목:
  - 그룹 `PURCHASE_TAX_TYPE`(부가세구분, 정렬 120) + 항목 3건: `TAXABLE` 과세, `ZERO_RATED` 영세, `EXEMPT` 면세
- 적용 범위: 테넌트 1이 `tb_tenant`에 있을 때만 등록된다. `ON CONFLICT DO NOTHING`으로 재실행해도 중복 등록되지 않는다.
- 영향: 발주등록 화면의 부가세구분 선택값으로 사용할 예정이다. 포함/미포함 구분은 이 코드에 포함하지 않는다(별도 결정 대기). 기존 테이블 구조와 기존 공통코드는 변경하지 않는다.
- MCP 확인: `s-erp-postgresql-readonly`로 확인했다. 테넌트 1이 존재하고, 부가세·검사 관련 기존 공통코드 그룹이 없으며, 테넌트 1의 그룹 정렬 최대값이 110임을 확인했다.
- 적용 상태: SQL 스크립트만 작성했으며 실제 DB에는 적용하지 않았다.
- 롤백 여부: 제공함. 등록한 항목을 삭제하고, 그룹에 남은 항목이 없을 때만 그룹을 삭제한다.

적용 SQL: `20261113_001_seed_purchase_tax_type_codes.sql`

롤백 SQL: `20261113_001_rollback_purchase_tax_type_codes.sql`
