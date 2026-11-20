# 20261120_001 계정관리 tb_login_account 확장·메뉴 변경 이력

- 날짜: 2026-11-20
- 작업: 인사관리 2-2단계 계정관리 ([작업지시서](../../directions/20261120/20261120_001_hr-account_작업지시서.md), [사양서](../../spec/20261120/20261120_001_hr-account_상세사양서.md))
- 스크립트: `20261120_001_extend_login_account_menu.sql` / 롤백 `20261120_001_rollback_extend_login_account_menu.sql`
- 선행: 시스템 관리 메뉴(`ST_SYSTEM`, `ST_ROLES`). 함께 적용: 20261120_002 (정책 시드)

## 변경 내용
| 대상 | 변경 |
|---|---|
| `tb_login_account` | `password_change_required CHAR(1) NOT NULL DEFAULT 'N'`, `updated_by BIGINT NULL` 추가 |
| 제약 | `ck_login_account_pwd_change_required` (`Y`/`N`) |
| `tb_menu` | `ST_ACCOUNTS` 계정관리 `/settings/system/accounts` (`ST_SYSTEM` 아래, 정렬 25) |
| 권한 | 메뉴 권한·역할 권한을 `ST_ROLES`(권한관리)에서 복사 |

## 영향 범위
- 기존 계정 13건은 `password_change_required = 'N'`이라 로그인·변경 강제 동작에 영향이 없다(`password_changed_at`이 비어 있는 2건도 강제 대상이 아니다).
- `tb_login_account`를 읽는 로그인·프로필·결재 등은 구조가 바뀌지 않는다(새 컬럼은 기본값이 있다).
- 다른 테넌트에는 메뉴를 만들지 않는다(기존 시드와 동일하게 테넌트 1).

## 롤백
롤백 스크립트로 가능하다. 두 컬럼 값은 사라진다.
