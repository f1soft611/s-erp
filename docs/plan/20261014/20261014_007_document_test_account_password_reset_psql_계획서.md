# 20261014_007 문서작성 테스트 계정 psql 직접 실행 SQL 계획서

## 목표

기존 SQL의 해시 GUC 누락을 해결하고 psql에서 별도 로컬 도구 없이 직접 실행할 수 있도록 만든다.

## 근거

- 작업지시서: [20261014_007 작업지시서](../../directions/20261014/20261014_007_document_test_account_password_reset_psql_작업지시서.md)
- 승인 설계: [psql 직접 실행 SQL 설계](../../superpowers/specs/2026-10-14-document-test-account-password-reset-psql-design.md)
- 기존 로그인 계약: [20261014_005 상세사양서](../../spec/20261014/20261014_005_document_test_account_password_reset_상세사양서.md)

## 수정 파일

- `docs/database/20261014/20261014_002_reset_document_test_account_passwords.sql`: psql 숨김 불가 프롬프트, 내장 sha256 기반 해시 입력 구성 및 비밀변수 정리.
- `backend/DATABASE/20261014/20261014_002_reset_document_test_account_passwords.sql`: 위 SQL과 동일한 사본.
- `tools/tests/test_document_test_account_password_reset.cjs`: direct psql input/hash contract과 기존 transaction guards를 검사.
- 두 위치의 기존 `20261014_002_change_test_account_passwords.md`: 입력 흐름과 psql 로그 노출 위험을 갱신.
- `docs/directions`, `docs/plan`, `docs/spec`, `docs/result`의 20261014_007 문서: 작업/명세/검증 근거.

별도 PowerShell 실행 도구 및 그 테스트는 제거한다. 스키마는 변경하지 않는다.

## 순서

1. 직접 실행 프롬프트와 해시 매핑을 확인하는 테스트를 먼저 추가해 실패를 확인한다.
2. 기존 SQL 및 동일 backend 복사본에 psql 입력/해시 생성을 구현한다.
3. 실패 입력, 대상 범위, 행 잠금, 업데이트 컬럼, 오류 중단 계약 테스트를 통과시킨다.
4. 변경 이력 문서와 결과 문서를 업데이트한다.
5. SQL/이력 사본 해시 동일성, 공백, 기존 무관 변경 보존을 확인한다.

## 검증

```powershell
node --test tools/tests/test_document_test_account_password_reset.cjs
git diff --check
```

실제 DB UPDATE 및 계정 로그인은 실행하지 않는다.
