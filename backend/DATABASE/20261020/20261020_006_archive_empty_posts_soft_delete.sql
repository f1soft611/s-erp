UPDATE tb_board_post p
SET is_deleted = 'Y',
    updated_at = CURRENT_TIMESTAMP,
    last_modified_by = 'archive-cleanup-20261020-006',
    last_modified_by_name = 'archive-cleanup-20261020-006'
WHERE p.board_type_code = 'ARCHIVE'
  AND p.is_deleted = 'N'
  AND NOT EXISTS (
      SELECT 1
      FROM tb_common_file f
      WHERE f.tenant_id = p.tenant_id
        AND f.owner_type = 'ARCHIVE'
        AND f.owner_id = p.post_id
        AND f.file_usage_type = 'ATTACHMENT'
        AND f.deleted_yn = 'N'
  );
