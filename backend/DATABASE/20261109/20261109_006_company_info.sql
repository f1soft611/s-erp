-- 20261109_006_company_info.sql
-- 대상 테이블: public.tb_tenant
-- 목적: 공급자 회사정보에 대표자, 우편번호, 주소, 전화번호, 팩스번호 저장
-- 적용: 트랜잭션 단위로 실행. 기존 테넌트별 회사 및 관리자 정보는 유지한다.
BEGIN;

ALTER TABLE public.tb_tenant
    ADD COLUMN president_name VARCHAR(100),
    ADD COLUMN post_code VARCHAR(20),
    ADD COLUMN address VARCHAR(500),
    ADD COLUMN telephone_no VARCHAR(50),
    ADD COLUMN facsimile_no VARCHAR(50);

COMMIT;
