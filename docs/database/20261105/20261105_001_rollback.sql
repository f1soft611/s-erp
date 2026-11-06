-- 20261105_001_rollback.sql
-- 주의: tb_warehouse 테이블과 저장된 모든 데이터가 삭제됩니다.
-- 참고: 현재 다른 테이블에서 tb_warehouse를 참조하는 FK는 없음 (2026-11-05 MCP 조회 기준).

DROP TABLE IF EXISTS public.tb_warehouse;
