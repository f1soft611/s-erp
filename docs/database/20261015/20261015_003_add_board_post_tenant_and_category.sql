-- 20261015_003 Add tenant ownership and shared category storage to community posts.
-- Review and schedule this migration before applying it to a database.

BEGIN;

LOCK TABLE public.tb_tenant IN SHARE MODE;

DO $migration$
DECLARE
    tenant_count BIGINT;
    sole_tenant_id BIGINT;
BEGIN
    SELECT COUNT(*), MIN(tenant_id)
      INTO tenant_count, sole_tenant_id
      FROM public.tb_tenant;

    IF tenant_count <> 1 THEN
        RAISE EXCEPTION
            'Cannot backfill tb_board_post.tenant_id: expected exactly one tenant, found %',
            tenant_count;
    END IF;

    ALTER TABLE public.tb_board_post
        RENAME COLUMN notice_gubun_code TO category_code;

    ALTER TABLE public.tb_board_post
        ADD COLUMN tenant_id BIGINT;

    UPDATE public.tb_board_post
       SET tenant_id = sole_tenant_id;

    ALTER TABLE public.tb_board_post
        ALTER COLUMN tenant_id SET NOT NULL;

    ALTER TABLE public.tb_board_post
        ADD CONSTRAINT fk_board_post_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id);

    CREATE INDEX ix_board_post_tenant_type_newest
        ON public.tb_board_post (
            tenant_id,
            board_type_code,
            created_at DESC,
            post_id DESC
        );
END
$migration$;

COMMIT;
