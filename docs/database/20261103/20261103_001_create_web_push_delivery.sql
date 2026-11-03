-- Target database: s-erp_central (PostgreSQL)
-- Scope: shared browser push subscriptions, notification outbox, and per-device deliveries.
-- Reference migration only. Do not execute automatically or apply to an existing database.

BEGIN;

CREATE TABLE public.tb_push_subscription (
    subscription_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    endpoint_hash BYTEA NOT NULL UNIQUE,
    endpoint_ciphertext BYTEA NOT NULL,
    keys_ciphertext BYTEA NOT NULL,
    encryption_key_version VARCHAR(40) NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    inactive_at TIMESTAMP,
    CONSTRAINT fk_push_subscription_tenant
        FOREIGN KEY (tenant_id) REFERENCES public.tb_tenant (tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_push_subscription_user
        FOREIGN KEY (user_id) REFERENCES public.tb_user (user_id) ON DELETE CASCADE,
    CONSTRAINT chk_push_subscription_status
        CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE INDEX idx_push_subscription_active_recipient
    ON public.tb_push_subscription (tenant_id, user_id, subscription_id)
    WHERE status = 'ACTIVE';

CREATE TABLE public.tb_push_outbox (
    outbox_id BIGSERIAL PRIMARY KEY,
    notification_id BIGINT NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    lease_token UUID,
    lease_until TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    CONSTRAINT fk_push_outbox_notification
        FOREIGN KEY (notification_id) REFERENCES public.tb_notification (notification_id) ON DELETE CASCADE,
    CONSTRAINT chk_push_outbox_status
        CHECK (status IN ('PENDING', 'PROCESSING', 'EXPANDED', 'NO_RECIPIENT', 'COMPLETED', 'FAILED')),
    CONSTRAINT chk_push_outbox_attempt_count
        CHECK (attempt_count >= 0)
);

CREATE INDEX idx_push_outbox_claim_pending
    ON public.tb_push_outbox (created_at, outbox_id)
    WHERE status = 'PENDING';
CREATE INDEX idx_push_outbox_claim_expired
    ON public.tb_push_outbox (lease_until, outbox_id)
    WHERE status = 'PROCESSING';

CREATE TABLE public.tb_push_delivery (
    delivery_id BIGSERIAL PRIMARY KEY,
    outbox_id BIGINT NOT NULL,
    subscription_id BIGINT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMP,
    lease_token UUID,
    lease_until TIMESTAMP,
    last_error_code VARCHAR(40),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    CONSTRAINT fk_push_delivery_outbox
        FOREIGN KEY (outbox_id) REFERENCES public.tb_push_outbox (outbox_id) ON DELETE CASCADE,
    CONSTRAINT fk_push_delivery_subscription
        FOREIGN KEY (subscription_id) REFERENCES public.tb_push_subscription (subscription_id) ON DELETE CASCADE,
    CONSTRAINT uq_push_delivery_outbox_subscription
        UNIQUE (outbox_id, subscription_id),
    CONSTRAINT chk_push_delivery_status
        CHECK (status IN (
            'PENDING', 'PROCESSING', 'RETRY_WAIT', 'SENT',
            'PERMANENT_FAILURE', 'EXHAUSTED', 'SUPPRESSED'
        )),
    CONSTRAINT chk_push_delivery_attempt_count
        CHECK (attempt_count >= 0)
);

CREATE INDEX idx_push_delivery_claim_pending
    ON public.tb_push_delivery (created_at, delivery_id)
    WHERE status = 'PENDING';
CREATE INDEX idx_push_delivery_claim_retry
    ON public.tb_push_delivery (next_attempt_at, delivery_id)
    WHERE status = 'RETRY_WAIT';
CREATE INDEX idx_push_delivery_claim_expired
    ON public.tb_push_delivery (lease_until, delivery_id)
    WHERE status = 'PROCESSING';

COMMIT;
