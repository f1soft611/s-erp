-- The seed may have reused existing menu IDs and role grants. Restore the verified pre-apply backup.
DO $rollback$
BEGIN
    RAISE EXCEPTION 'Automatic rollback is unsafe; restore the pre-apply menu and permission backup.';
END;
$rollback$;
