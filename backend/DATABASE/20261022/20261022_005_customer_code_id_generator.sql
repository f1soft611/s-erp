BEGIN;

-- Initialize the existing eGov ID Generator counter for tb_customer_info.

INSERT INTO public.ids (table_name, next_id)
SELECT
    'tb_customer_info',
    COALESCE(MAX(customer_code::BIGINT), 0) + 1
FROM public.tb_customer_info
WHERE customer_code ~ '^[0-9]{1,6}$'
ON CONFLICT (table_name) DO UPDATE
SET next_id = GREATEST(public.ids.next_id, EXCLUDED.next_id),
    updated_at = CURRENT_TIMESTAMP;

COMMIT;
