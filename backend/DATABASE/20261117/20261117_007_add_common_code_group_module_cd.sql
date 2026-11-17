-- 20261117_007 공통코드 그룹 모듈 구분 컬럼 추가
-- 대상: tb_common_code_group
BEGIN;

ALTER TABLE tb_common_code_group
    ADD COLUMN IF NOT EXISTS module_cd varchar(50);

COMMENT ON COLUMN tb_common_code_group.module_cd IS '업무 모듈 구분(tb_module.module_code 참조, NULL=공통)';

CREATE INDEX IF NOT EXISTS idx_common_code_group_module
    ON tb_common_code_group (tenant_id, module_cd);

COMMIT;
