DELETE FROM tb_system_policy
WHERE policy_code LIKE 'GRID\_DECIMAL\_%' AND system_policy_at = 'N';
