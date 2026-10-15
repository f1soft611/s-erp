-- 20261015_003 Roll back tenant ownership and shared category storage on community posts.
-- This rollback refuses to discard distinct tenant assignments.

BEGIN;

LOCK TABLE public.tb_board_post IN ACCESS EXCLUSIVE MODE;

DO $rollback$
DECLARE
    assigned_tenant_count BIGINT;
BEGIN
    SELECT COUNT(DISTINCT tenant_id)
      INTO assigned_tenant_count
      FROM public.tb_board_post;

    IF assigned_tenant_count > 1 THEN
        RAISE EXCEPTION
            'Cannot roll back tb_board_post tenant ownership: posts belong to % distinct tenants',
            assigned_tenant_count;
    END IF;

    DROP INDEX IF EXISTS public.ix_board_post_tenant_type_newest;

    ALTER TABLE public.tb_board_post
        DROP CONSTRAINT IF EXISTS fk_board_post_tenant;

    ALTER TABLE public.tb_board_post
        DROP COLUMN tenant_id;

    ALTER TABLE public.tb_board_post
        RENAME COLUMN category_code TO notice_gubun_code;
END
$rollback$;

COMMIT;
