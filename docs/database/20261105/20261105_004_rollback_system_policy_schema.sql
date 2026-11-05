-- 20261105_004 시스템 정책 저장소 롤백 (유지보수 전용)
-- 사용자 생성 정책 또는 변경 이력이 하나라도 있으면 중단한다. 데이터를 조용히 삭제하지 않는다.
-- 기본 정책의 실제 값은 tb_tenant 컬럼에 남아 있으므로 테이블 제거 후에도 업무 동작은 유지된다.
-- 메뉴는 20261105_004_rollback_system_policy_menu.sql 로 먼저 제거한다.
BEGIN;

DO $system_policy_rollback$
BEGIN
    -- PL/pgSQL 은 조건식 전체를 계획하므로 테이블 존재 확인을 중첩해 재실행 시에도 안전하게 한다.
    IF to_regclass('public.tb_system_policy_history') IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.tb_system_policy_history) THEN
            RAISE EXCEPTION 'tb_system_policy_history contains audit rows. Archive them and get approval before rollback.';
        END IF;
    END IF;
    IF to_regclass('public.tb_system_policy') IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.tb_system_policy WHERE system_policy_at = 'N') THEN
            RAISE EXCEPTION 'tb_system_policy contains custom policies. Archive them and get approval before rollback.';
        END IF;
    END IF;
END;
$system_policy_rollback$;

DROP TABLE IF EXISTS public.tb_system_policy_history;
DROP TABLE IF EXISTS public.tb_system_policy;

COMMIT;