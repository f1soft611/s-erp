# 20261120_002 계정 보안 정책 시드 변경 이력

- 날짜: 2026-11-20
- 작업: 인사관리 2-2단계 계정관리 ([사양서 1.2·1.3](../../spec/20261120/20261120_001_hr-account_상세사양서.md))
- 스크립트: `20261120_002_seed_account_security_policies.sql` / 롤백 `20261120_002_rollback_seed_account_security_policies.sql`
- 선행: 없음(`tb_system_policy` 존재). 함께 적용: 20261120_001

## 변경 내용
| 대상 | 변경 |
|---|---|
| `tb_system_policy` | 모든 테넌트에 `LOGIN_LOCK_ENABLED`(BOOLEAN, false), `LOGIN_LOCK_MAX_ATTEMPTS`(NUMBER, 5, 3~10 회), `PROFILE_PHOTO_EDIT_MODE`(SELECT, SELF) 추가. 정책이 이미 있는 테넌트는 건너뛴다 |
| `tb_user.photo_image` | 사원 사진이 없고 계정 사진(`tb_login_account.profile_image`)이 있으면 복사(덮어쓰기 없음) |

## 영향 범위
- 기본값이 미사용·본인 허용이라 시드만으로 로그인·내 정보 동작은 바뀌지 않는다.
- 새 테넌트는 SQL로 생성하므로 생성 후 이 스크립트를 다시 실행한다. 서버도 정책관리 조회 시 빠진 3종을 기본값으로 보정한다(사양서 1.3).
- 사진 보정 건수는 적용 전후 `tb_user.photo_image` 건수로 대조한다(적용 전 9건).

## 롤백
정책 3종은 롤백 스크립트로 삭제한다. 사진 보정은 되돌리지 않는다.
