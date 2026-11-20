-- 20261120_002 롤백: 계정 보안 정책 3종 삭제
-- 사진 보정은 되돌리지 않는다(복사만 했고 원본 계정 사진은 그대로다). 정책 변경 이력(tb_system_policy_history)은 FK가 없어 유지된다.
BEGIN;

DELETE FROM tb_system_policy
WHERE policy_code IN ('LOGIN_LOCK_ENABLED', 'LOGIN_LOCK_MAX_ATTEMPTS', 'PROFILE_PHOTO_EDIT_MODE')
  AND system_policy_at = 'N';

COMMIT;
