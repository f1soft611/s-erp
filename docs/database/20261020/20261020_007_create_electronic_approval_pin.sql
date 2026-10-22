-- Target database: s-erp_central (PostgreSQL)
-- Scope: store personal pins for readable electronic approval documents.
-- This script is a migration draft. Review and schedule it before applying to a database.

BEGIN;

CREATE TABLE public.tb_electronic_approval_pin (
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    electronic_approval_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_electronic_approval_pin
        PRIMARY KEY (tenant_id, user_id, electronic_approval_id),
    CONSTRAINT fk_electronic_approval_pin_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_electronic_approval_pin_user
        FOREIGN KEY (user_id)
        REFERENCES public.tb_user (user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_electronic_approval_pin_document
        FOREIGN KEY (tenant_id, electronic_approval_id)
        REFERENCES public.tb_electronic_approval_main (tenant_id, electronic_approval_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_electronic_approval_pin_document
    ON public.tb_electronic_approval_pin (tenant_id, electronic_approval_id);

COMMIT;
