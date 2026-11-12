-- 데이터가 존재하면 자동 삭제하지 않는다.
BEGIN;
DO $rollback$
BEGIN
    IF EXISTS (SELECT 1 FROM tb_process) OR EXISTS (SELECT 1 FROM tb_process_group) THEN
        RAISE EXCEPTION 'Process data exists; back up and review before rollback.';
    END IF;
END
$rollback$;
DROP TABLE tb_process;
DROP TABLE tb_process_group;
COMMIT;
