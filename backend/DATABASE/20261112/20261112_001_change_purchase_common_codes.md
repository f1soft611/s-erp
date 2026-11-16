# 구매자재 공통코드(발주구분·사용용도) 등록 변경 이력

- 변경일: 2026-11-12
- 대상 테이블: `public.tb_common_code_group`, `public.tb_common_code_item`
- 대상 테넌트: `1` (스크립트에 고정)
- 변경 항목:
  - 그룹 `PURCHASE_ORDER_TYPE`(발주구분) + 항목 10건: `CS_MATERIAL` C/S자재, `RAW_MATERIAL` 원자재, `OUTSOURCE_PROCESS` 외주가공, `SUB_MATERIAL` 부자재, `SUPPLIED_RAW` 사급원자재, `SUPPLIED_SUB` 사급부자재, `GOODS` 상품, `CONSUMABLE` 소모품, `DEVELOPMENT` 개발용, `DEV_CONSUMABLE` 개발용소모품
  - 그룹 `PURCHASE_USE_TYPE`(사용용도) + 항목 11건: `PRODUCTION` 생산, `DEVELOPMENT` 개발, `CS` C/S, `SPARE` Spare, `PART_MATERIAL` 부품소재, `PART_DELIVERY` 부품납품, `DESIGN_CHANGE` 설계변경, `ASSET` 비품/공구/자산, `EXTRA_INSTALL` 추가설치(고객요청시), `WORK_MISTAKE` 작업실수, `RAW_DEFECT` 원자재불량
- 적용 범위: 테넌트 1이 `tb_tenant`에 있을 때만 등록된다. `ON CONFLICT DO NOTHING`으로 재실행해도 중복 등록되지 않는다.
- 영향: 구매자재 모듈(구매요청/구매요청확정/발주)의 선택값으로 사용할 예정이다. 발주구분과 사용용도는 별개 개념이다. 기존 테이블 구조와 기존 공통코드는 변경하지 않는다.
- MCP 확인: `s-erp-postgresql-readonly`로 `tb_common_code_item` 구조와 기존 그룹 목록을 조회했고 두 그룹이 없음을 확인했다. `s-erp-postgresql-readonly` 연결 DB에 테넌트 1이 존재하고 두 그룹이 아직 없음을 확인했다.
- 적용 상태: SQL 스크립트만 작성했으며 실제 DB에는 적용하지 않았다.
- 롤백 여부: 제공함. 등록한 항목을 삭제하고, 그룹에 남은 항목이 없을 때만 그룹을 삭제한다.

적용 SQL: `20261112_001_seed_purchase_common_codes.sql`

롤백 SQL: `20261112_001_rollback_purchase_common_codes.sql`
