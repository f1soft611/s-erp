-- Exact reversal requires the pre-migration menu and permission backup.
-- Do not infer whether a child existed before the migration or recreate its parent
-- with a different ID. Restore the approved backup using the normal DBA procedure.
BEGIN;
DO $rollback$
BEGIN
    RAISE EXCEPTION 'Automatic rollback is unsafe: restore the verified pre-migration menu and permission backup.';
END;
$rollback$;
ROLLBACK;
