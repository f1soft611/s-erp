DELETE FROM tb_system_policy
WHERE policy_code = 'STATEMENT_ISSUE_MODE' AND system_policy_at = 'N';

UPDATE tb_menu SET menu_nm = '거래명세서등록'
WHERE menu_url = '/sales/delivery/statement-create' AND menu_nm = '거래명세서발행';
