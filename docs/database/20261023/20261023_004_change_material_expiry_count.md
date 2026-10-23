# 소비기한 기준·숫자 정합성 변경 이력

- 변경일: 2026-10-23
- 대상 테이블: `public.tb_material_info`
- 변경 항목: `ck_tb_material_info_expiryed_pair` CHECK 제약 추가
- 적용 범위: 소비기한 미관리(`NONE`) 행은 계산 숫자를 NULL로 유지하고, `DAY`/`MONTH`/`YEAR` 행은 양의 정수를 저장하도록 제한한다. 기존 소비기한 기준 및 숫자 CHECK는 유지한다.
- 영향: 새 품목 저장과 수정 시 기준·숫자 조합이 맞지 않으면 거부된다. 새 컬럼이나 API 필드는 추가하지 않는다. 사전 제한 집계에서는 기준·숫자가 불일치한 기존 품목 행이 확인되지 않았다.
- 적용 상태: SQL 스크립트만 작성했으며 MCP 및 실제 DB에는 적용하지 않았다.
- 롤백 여부: 제공함. 아래 롤백은 새 CHECK만 제거하고 테이블·행 데이터·기존 제약은 변경하지 않는다.

적용 SQL: `20261023_004_require_material_expiry_count.sql`

롤백 SQL: `20261023_004_rollback_material_expiry_count.sql`
