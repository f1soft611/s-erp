-- Target database: s-erp_central (PostgreSQL)
-- Scope: shared recipient notifications and one-to-one direct messages.
-- Reference/provisioning draft only. These tables already exist in the inspected database.
-- Do not apply this script or its rollback to an existing database.

BEGIN;

CREATE TABLE public.tb_notification (
    notification_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    recipient_user_id BIGINT NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    source_type VARCHAR(30) NOT NULL,
    source_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    summary VARCHAR(500) NOT NULL,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_tenant
        FOREIGN KEY (tenant_id) REFERENCES public.tb_tenant (tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_recipient
        FOREIGN KEY (recipient_user_id) REFERENCES public.tb_user (user_id) ON DELETE CASCADE,
    CONSTRAINT uq_notification_source_recipient
        UNIQUE (tenant_id, recipient_user_id, event_type, source_type, source_id),
    CONSTRAINT chk_notification_event_source
        CHECK (
            (event_type = 'APPROVAL_COMMENT_MENTION' AND source_type = 'APPROVAL_COMMENT')
            OR
            (event_type = 'DIRECT_MESSAGE_RECEIVED' AND source_type = 'DIRECT_MESSAGE')
        ),
    CONSTRAINT chk_notification_title
        CHECK (LENGTH(BTRIM(title)) > 0),
    CONSTRAINT chk_notification_summary
        CHECK (LENGTH(BTRIM(summary)) > 0)
);

CREATE INDEX idx_notification_recipient_unread
    ON public.tb_notification (tenant_id, recipient_user_id, created_at DESC, notification_id DESC)
    WHERE read_at IS NULL;
CREATE INDEX idx_notification_recipient_page
    ON public.tb_notification (tenant_id, recipient_user_id, created_at DESC, notification_id DESC);

CREATE TABLE public.tb_direct_message_thread (
    thread_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    participant_a_user_id BIGINT NOT NULL,
    participant_b_user_id BIGINT NOT NULL,
    subject VARCHAR(120),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_direct_message_thread_tenant
        FOREIGN KEY (tenant_id) REFERENCES public.tb_tenant (tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_direct_message_thread_participant_a
        FOREIGN KEY (participant_a_user_id) REFERENCES public.tb_user (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_direct_message_thread_participant_b
        FOREIGN KEY (participant_b_user_id) REFERENCES public.tb_user (user_id) ON DELETE CASCADE,
    CONSTRAINT uq_direct_message_thread_tenant_id UNIQUE (tenant_id, thread_id),
    CONSTRAINT chk_direct_message_thread_participants
        CHECK (participant_a_user_id < participant_b_user_id),
    CONSTRAINT chk_direct_message_thread_subject
        CHECK (subject IS NULL OR LENGTH(subject) <= 120)
);

CREATE INDEX idx_direct_message_thread_participant_a
    ON public.tb_direct_message_thread (tenant_id, participant_a_user_id, updated_at DESC, thread_id DESC);
CREATE INDEX idx_direct_message_thread_participant_b
    ON public.tb_direct_message_thread (tenant_id, participant_b_user_id, updated_at DESC, thread_id DESC);

CREATE TABLE public.tb_direct_message (
    message_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    thread_id BIGINT NOT NULL,
    sender_user_id BIGINT NOT NULL,
    recipient_user_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    CONSTRAINT fk_direct_message_thread
        FOREIGN KEY (tenant_id, thread_id)
        REFERENCES public.tb_direct_message_thread (tenant_id, thread_id) ON DELETE CASCADE,
    CONSTRAINT fk_direct_message_sender
        FOREIGN KEY (sender_user_id) REFERENCES public.tb_user (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_direct_message_recipient
        FOREIGN KEY (recipient_user_id) REFERENCES public.tb_user (user_id) ON DELETE CASCADE,
    CONSTRAINT chk_direct_message_distinct_users
        CHECK (sender_user_id <> recipient_user_id),
    CONSTRAINT chk_direct_message_content
        CHECK (LENGTH(BTRIM(content)) BETWEEN 1 AND 5000)
);

CREATE INDEX idx_direct_message_thread_order
    ON public.tb_direct_message (tenant_id, thread_id, created_at ASC, message_id ASC);
CREATE INDEX idx_direct_message_inbox_unread
    ON public.tb_direct_message (tenant_id, recipient_user_id, created_at DESC, message_id DESC)
    WHERE read_at IS NULL;
CREATE INDEX idx_direct_message_sender
    ON public.tb_direct_message (tenant_id, sender_user_id, created_at DESC, message_id DESC);

COMMIT;
