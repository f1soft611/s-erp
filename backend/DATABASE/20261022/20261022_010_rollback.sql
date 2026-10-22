BEGIN;

-- Application rollback only: retain tb_material_info IDS state.
-- Never lower or delete the counter, which could reuse issued material codes.
SELECT 1;

COMMIT;
