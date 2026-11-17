# 공통코드 그룹 모듈 구분 컬럼 변경 이력

- 날짜: 2026-11-17
- 대상 테이블: `tb_common_code_group`
- 내용: `module_cd varchar(50) NULL` 컬럼과 `(tenant_id, module_cd)` 인덱스 추가. 값은 시스템 모듈관리 `tb_module.module_code`(테넌트 내 유일)를 저장하며 NULL은 공통(미지정)이다. FK는 두지 않고 서버(`CommonCodeGroupServiceImpl`)가 같은 테넌트의 tb_module 존재 여부를 검증한다.
- 영향 범위: 기존 그룹은 모두 NULL(공통)로 유지된다. 공통코드 관리 화면 필터/그룹 폼, `/api/v1/co/master/common-code/groups` 조회·저장. 상세코드·참조 업무 코드 변경 없음.
- MCP 근거: `s-erp-postgresql-readonly` `list_tables`, `describe_table tb_common_code_group`(module_cd 부재), `describe_table tb_module`(module_code varchar NOT NULL) 확인.
- 적용: `psql -X -v ON_ERROR_STOP=1 -f 20261117_007_add_common_code_group_module_cd.sql` (이 작업은 스크립트 제공이며 업무 DB에는 적용하지 않음).
- 롤백: `20261117_007_rollback_common_code_group_module_cd.sql` (모듈 구분 값 손실).
