# 회사정보 스키마 변경 이력

- 날짜: 2026-11-09
- 변경: `tb_tenant`에 대표자명, 우편번호, 주소, 전화번호, 팩스번호 컬럼 추가
- 대상 테이블: `public.tb_tenant`
- 영향 범위: 회사정보 조회·수정과 추후 거래명세서의 공급자 정보. 기존 회사명·사업자번호·업태·종목 및 관리자 필드는 변경하지 않는다.
- 롤백: `20261109_006_company_info_rollback.sql` 제공. 롤백 시 신규 컬럼 데이터가 제거되므로 사전 백업이 필요하다.
- DB 확인: 기본 `s-erp-postgresql-readonly`의 `list_tables` 및 `describe_table(tb_tenant)`에서 기존 `tenant_nm`, `business_registration_number`, `business_type`, `business_category`를 확인했다. 추가할 다섯 컬럼은 없었으며 업무 행 데이터는 조회하지 않았다.
