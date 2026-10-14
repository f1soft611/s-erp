-- 20261014_001 전자결재 사용자별 조회수 및 조회 이력 추가
BEGIN;

ALTER TABLE public.tb_electronic_approval_main
    ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

DO $migration$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.tb_electronic_approval_main'::regclass
          AND conname = 'chk_electronic_approval_main_view_count'
    ) THEN
        ALTER TABLE public.tb_electronic_approval_main
            ADD CONSTRAINT chk_electronic_approval_main_view_count
            CHECK (view_count >= 0);
    END IF;
END
$migration$;

CREATE TABLE IF NOT EXISTS public.tb_electronic_approval_view_history (
    view_history_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES public.tb_tenant (tenant_id),
    electronic_approval_id BIGINT NOT NULL,
    login_id BIGINT NOT NULL REFERENCES public.tb_login_account (login_id),
    viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_electronic_approval_view_history_document
        FOREIGN KEY (tenant_id, electronic_approval_id)
        REFERENCES public.tb_electronic_approval_main (tenant_id, electronic_approval_id)
        ON DELETE CASCADE,
    CONSTRAINT uk_electronic_approval_view_history_tenant_document_login
        UNIQUE (tenant_id, electronic_approval_id, login_id)
);

CREATE INDEX IF NOT EXISTS ix_electronic_approval_view_history_document
    ON public.tb_electronic_approval_view_history (tenant_id, electronic_approval_id);

COMMIT;
