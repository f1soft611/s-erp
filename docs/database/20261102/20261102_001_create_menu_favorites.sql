-- Target database: s-erp_central (PostgreSQL)
-- Scope: per-user menu favorite folders and menu references.
-- Reference/provisioning draft only. Do not apply to a live database in this task.

BEGIN;

CREATE TABLE public.tb_user_menu_favorite_folder (
    favorite_folder_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    folder_nm VARCHAR(40) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_menu_favorite_folder_tenant
        FOREIGN KEY (tenant_id) REFERENCES public.tb_tenant (tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_menu_favorite_folder_user
        FOREIGN KEY (user_id) REFERENCES public.tb_user (user_id) ON DELETE CASCADE,
    CONSTRAINT uq_user_menu_favorite_folder_owner
        UNIQUE (favorite_folder_id, tenant_id, user_id),
    CONSTRAINT chk_user_menu_favorite_folder_name
        CHECK (LENGTH(BTRIM(folder_nm)) BETWEEN 1 AND 40)
);

CREATE INDEX idx_user_menu_favorite_folder_owner
    ON public.tb_user_menu_favorite_folder (tenant_id, user_id, favorite_folder_id);

CREATE TABLE public.tb_user_menu_favorite (
    favorite_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    menu_id BIGINT NOT NULL,
    favorite_folder_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_menu_favorite_tenant
        FOREIGN KEY (tenant_id) REFERENCES public.tb_tenant (tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_menu_favorite_user
        FOREIGN KEY (user_id) REFERENCES public.tb_user (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_menu_favorite_menu
        FOREIGN KEY (menu_id) REFERENCES public.tb_menu (menu_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_menu_favorite_folder_owner
        FOREIGN KEY (favorite_folder_id, tenant_id, user_id)
        REFERENCES public.tb_user_menu_favorite_folder (favorite_folder_id, tenant_id, user_id),
    CONSTRAINT uq_user_menu_favorite_menu
        UNIQUE (tenant_id, user_id, menu_id)
);

CREATE INDEX idx_user_menu_favorite_owner_location
    ON public.tb_user_menu_favorite (tenant_id, user_id, favorite_folder_id, favorite_id);

COMMIT;
