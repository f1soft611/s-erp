-- 20261117_007 롤백: 공통코드 그룹 모듈 구분 컬럼 제거
BEGIN;

DROP INDEX IF EXISTS idx_common_code_group_module;
ALTER TABLE tb_common_code_group DROP COLUMN IF EXISTS module_cd;

COMMIT;
