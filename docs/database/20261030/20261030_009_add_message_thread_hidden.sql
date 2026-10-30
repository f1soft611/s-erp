-- Add per-participant soft delete (hide) for 1:1 message threads.
-- A participant hides a thread only for themselves; a newer message makes it visible again.
-- Reference migration; do not execute through the read-only MCP.

BEGIN;

ALTER TABLE public.tb_direct_message_thread
    ADD COLUMN participant_a_hidden_at TIMESTAMP,
    ADD COLUMN participant_b_hidden_at TIMESTAMP;

COMMENT ON COLUMN public.tb_direct_message_thread.participant_a_hidden_at
    IS 'participant_a 사용자가 대화방을 삭제(숨김)한 시각. 이 시각 이전 메시지는 해당 사용자에게 표시하지 않는다.';
COMMENT ON COLUMN public.tb_direct_message_thread.participant_b_hidden_at
    IS 'participant_b 사용자가 대화방을 삭제(숨김)한 시각. 이 시각 이전 메시지는 해당 사용자에게 표시하지 않는다.';

COMMIT;
