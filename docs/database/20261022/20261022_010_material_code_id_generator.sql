BEGIN;

-- Preserve issued codes across reapplication and include deleted materials.
INSERT INTO public.ids (table_name, next_id)
SELECT 'tb_material_info', COALESCE(MAX(material_code::BIGINT), 0) + 1
FROM public.tb_material_info
WHERE material_code ~ '^[0-9]{1,6}$'
ON CONFLICT (table_name) DO UPDATE
SET next_id = GREATEST(public.ids.next_id, EXCLUDED.next_id),
    updated_at = CURRENT_TIMESTAMP;

COMMIT;
